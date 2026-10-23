"""Optional Chromium integration smoke test. Uses fixture pages and synthetic devices, not Netflix accounts."""
import os
import shutil
import subprocess
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
PORT = 18878
SIGNALING_ONLY = '--signaling-only' in sys.argv
server = subprocess.Popen(['node', 'server/index.js'], cwd=ROOT, env={**os.environ, 'PORT': str(PORT), 'RTC_ICE_SERVERS_JSON': os.environ.get('CILTRO_TEST_ICE_SERVERS_JSON', '[]')}, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
try:
    assert b'listening' in server.stdout.readline(), 'Test coordination server failed to start'
    with sync_playwright() as p:
        options = {'headless': True, 'args': ['--use-fake-device-for-media-stream']}
        if shutil.which('chromium'):
            options['executable_path'] = shutil.which('chromium')
        browser = p.chromium.launch(**options)
        contexts = []
        errors = []
        def fixture(allow_devices=True):
            context = browser.new_context(viewport={'width': 1280, 'height': 800})
            contexts.append(context)
            permissions = ['local-network-access'] + (['camera', 'microphone'] if allow_devices else [])
            context.grant_permissions(permissions, origin='https://www.netflix.com')
            page = context.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.route('https://www.netflix.com/**', lambda route: route.fulfill(content_type='text/html; charset=utf-8', body='<html><body style="margin:0;background:#080e19;color:#aaa;font:16px system-ui"><p style="padding:32px">Netflix fixture · synthetic camera and microphone</p><video></video></body></html>'))
            page.goto('https://www.netflix.com/watch/81943171')
            page.evaluate('''() => {
              window.chrome = {runtime: {onMessage: {addListener(fn) {window.toggleCiltro = fn}}}};
              const attach = Element.prototype.attachShadow;
              Element.prototype.attachShadow = function(options) {return attach.call(this, {...options, mode:'open'})};
              window.testPeers = []; window.testTracks = [];
              const NativePeer = RTCPeerConnection;
              window.RTCPeerConnection = class extends NativePeer {constructor(...args) {super(...args); testPeers.push(this)}};
              const capture = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
              navigator.mediaDevices.getUserMedia = async constraints => {const stream = await capture(constraints); testTracks.push(...stream.getTracks()); return stream};
            }''')
            for file in ['services/netflix.js', 'panel.js', 'call.js', 'content.js']:
                page.add_script_tag(content=(ROOT / 'extension' / file).read_text())
            page.evaluate("toggleCiltro({type:'ciltro:toggle'})")
            page.locator('#settings-toggle').click()
            page.locator('#endpoint').fill(f'ws://localhost:{PORT}')
            page.locator('#settings-toggle').click()
            return page
        def no_capture(page):
            assert page.evaluate('testTracks.every(t => t.readyState === "ended")')
        def live_track_count(page, kind):
            return page.evaluate('(kind) => testTracks.filter(t => t.kind === kind && t.readyState === "live").length', kind)
        def inbound(page, kind):
            return page.evaluate('''async kind => {
              const pc = testPeers.at(-1); if (!pc || pc.connectionState !== 'connected') return 0;
              const stats = await pc.getStats(); let bytes = 0;
              stats.forEach(s => {if (s.type === 'inbound-rtp' && s.kind === kind) bytes += s.bytesReceived || 0}); return bytes;
            }''', kind)

        a, b = fixture(), fixture()
        assert a.evaluate('testTracks.length') == 0
        a.locator('#create').click()
        expect(a.locator('#room')).to_be_visible()
        code = a.locator('#invite-code').input_value()
        b.locator('#code').fill(code); b.locator('#join').click()
        expect(b.locator('#room')).to_be_visible()
        # Plain text is rendered as text, with labels supplied by server-authenticated sender IDs.
        a.locator('#message').fill('<script>hello</script>'); a.locator('#send').click()
        expect(a.locator('#log .sender')).to_have_text('You')
        expect(b.locator('#log .sender')).to_have_text('Your partner')
        expect(b.locator('#log')).to_contain_text('<script>hello</script>')
        assert b.locator('#log script').count() == 0
        a.locator('#join-voice').click()
        expect(a.locator('#call-status')).to_contain_text('Waiting for your partner')
        assert live_track_count(a, 'audio') == 1 and live_track_count(a, 'video') == 0
        assert b.evaluate('testTracks.length') == 0, 'Partner capture must require explicit consent'
        b.locator('#join-voice').click()
        for page in [a, b]:
            if SIGNALING_ONLY:
                page.wait_for_function('testPeers.at(-1)?.signalingState === "stable" && !!testPeers.at(-1)?.remoteDescription')
                assert page.evaluate('(testPeers.at(-1).localDescription.sdp.match(/a=sendrecv/g)||[]).length') == 2
            else:
                expect(page.locator('#call-status')).to_have_text('Call connected.', timeout=15000)
                page.wait_for_function('testPeers.at(-1)?.connectionState === "connected"')
            if page.locator('#enable-sound').is_visible():
                page.locator('#enable-sound').click()
        # Receive real RTP audio from Chromium synthetic microphones.
        for page in ([] if SIGNALING_ONLY else [a, b]):
            page.wait_for_function('''async () => {let received=0; (await testPeers.at(-1).getStats()).forEach(s=>{if(s.type==='inbound-rtp'&&s.kind==='audio')received+=s.bytesReceived||0}); return received>0}''', timeout=15000)
            assert inbound(page, 'audio') > 0
        a.locator('#toggle-camera').click(); b.locator('#toggle-camera').click()
        for page in [a, b]:
            expect(page.locator('#toggle-camera')).to_have_attribute('aria-pressed', 'true')
            if not SIGNALING_ONLY:
                page.wait_for_function('''async () => {let frames=0; (await testPeers.at(-1).getStats()).forEach(s=>{if(s.type==='inbound-rtp'&&s.kind==='video')frames+=s.framesDecoded||0}); return frames>0}''', timeout=15000)
            assert live_track_count(page, 'video') == 1
            if not SIGNALING_ONLY: expect(page.locator('#remote-placeholder')).to_be_hidden()
        a.locator('#toggle-microphone').click()
        expect(a.locator('#toggle-microphone')).to_have_attribute('aria-pressed', 'false')
        assert live_track_count(a, 'audio') == 0
        expect(b.locator('#remote-media-status')).to_have_text('Mic off')
        a.locator('#toggle-microphone').click()
        expect(a.locator('#toggle-microphone')).to_have_attribute('aria-pressed', 'true')
        assert live_track_count(a, 'audio') == 1
        a.locator('#toggle-camera').click()
        expect(a.locator('#toggle-camera')).to_have_attribute('aria-pressed', 'false')
        assert live_track_count(a, 'video') == 0
        expect(b.locator('#remote-placeholder')).to_be_visible()
        # Hiding the panel does not hang up the call.
        a.locator('#close').click(); a.evaluate("toggleCiltro({type:'ciltro:toggle'})")
        assert a.evaluate('testPeers.at(-1).signalingState') == 'stable'
        if not SIGNALING_ONLY: assert a.evaluate('testPeers.at(-1).connectionState') == 'connected'
        # Composer and Leave remain on screen even when the room section must scroll.
        for width, height in [(1280, 720), (800, 480), (390, 600)]:
            a.set_viewport_size({'width': width, 'height': height})
            for selector in ['.panel', '#chat', '#leave']:
                bounds = a.locator(selector).bounding_box()
                assert bounds['y'] >= 0 and bounds['y'] + bounds['height'] <= height, (selector, bounds)
        a.set_viewport_size({'width': 1280, 'height': 800})
        a.locator('#end-call').click()
        for page in [a, b]:
            expect(page.locator('#call-start')).to_be_visible()
            no_capture(page)
            assert page.evaluate('testPeers.every(pc=>pc.connectionState==="closed")')
        # Join video directly, then leaving the room stops capture at both ends.
        a.locator('#join-video').click(); b.locator('#join-video').click()
        for page in [a, b]:
            if SIGNALING_ONLY:
                page.wait_for_function('testPeers.at(-1)?.signalingState === "stable" && !!testPeers.at(-1)?.remoteDescription')
            else:
                expect(page.locator('#call-status')).to_have_text('Call connected.', timeout=15000)
            assert live_track_count(page, 'video') == 1
        a.locator('#leave').click()
        expect(a.locator('#setup')).to_be_visible()
        expect(b.locator('#call-start')).to_be_visible()
        no_capture(a); no_capture(b)
        # A browser permission denial must not enter an active call or capture anything.
        denied = fixture(False)
        denied.locator('#create').click(); expect(denied.locator('#room')).to_be_visible()
        denied.locator('#join-video').click()
        expect(denied.locator('#call-status')).to_contain_text('Access blocked', timeout=10000)
        expect(denied.locator('#call-start')).to_be_visible()
        assert denied.evaluate('testTracks.length') == 0
        # Starting capture and then losing coordination stops the hardware promptly.
        b.locator('#join-video').click()
        expect(b.locator('#call-status')).to_contain_text('Waiting for your partner')
        server.terminate(); server.wait(timeout=5)
        expect(b.locator('#call-status')).to_contain_text('Disconnected')
        no_capture(b)
        assert not errors, errors
        print('PASS: text sender labels/escaping; opt-in synthetic-device capture; mute/unmute; camera off; end/rejoin; room leave; coordination disconnect; permission denial; close/reopen; bounds at three sizes; bidirectional SDP negotiation.')
        print('SKIPPED: audio RTP, video decoding and connected-media checks (--signaling-only).' if SIGNALING_ONLY else 'PASS: actual WebRTC audio RTP and decoded video in both directions using synthetic devices.')
        print('Actual Netflix, physical-device and cross-network acceptance remain UNVERIFIED.')
        browser.close()
finally:
    if server.poll() is None:
        server.terminate(); server.wait(timeout=5)
