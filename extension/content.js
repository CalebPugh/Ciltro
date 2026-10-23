(() => {
  if (globalThis.__ciltro) return;
  globalThis.__ciltro = true;
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;right:16px;top:80px;width:310px;z-index:2147483647;display:none';
  document.documentElement.append(host);
  const root = host.attachShadow({mode: 'closed'});
  root.innerHTML = `<style>
    :host{all:initial}*{box-sizing:border-box}section{background:#171823;color:#f4f2fa;font:14px system-ui;border:1px solid #424052;border-radius:16px;padding:18px;box-shadow:0 12px 50px #0008}h1{font-size:24px;margin:0}small{color:#bbb8cc}button,input{font:inherit;border-radius:8px;padding:9px;border:1px solid #535065;margin-top:8px;width:100%}button{background:#7760d6;color:white;cursor:pointer}button:disabled{opacity:.45;cursor:default}input{background:#252533;color:white}button:focus-visible,input:focus-visible{outline:2px solid #bfb2ff;outline-offset:2px}#status{margin:14px 0;line-height:1.5}#log{max-height:170px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere}label{display:block;margin-top:12px}#close{float:right;width:auto;margin:0;padding:2px 8px;background:transparent}p{line-height:1.5}
    </style><section><button id="close" aria-label="Close panel">×</button><h1>Ciltro</h1><small>Netflix · development build</small><p id="status" role="status" aria-live="polite">Open a Netflix video.</p><label>Coordination server<input id="endpoint" value="ws://localhost:8787" spellcheck="false"></label><button id="create">Create room</button><label>Invitation code<input id="code" autocomplete="off" spellcheck="false"></label><button id="join">Join room</button><button id="copy">Copy code</button><button id="ready">Join playback</button><button id="resync">Resync my player</button><button id="leave">Leave room</button><p id="log" aria-live="polite"></p><form id="chat"><label>Message<input id="message" maxlength="1000" autocomplete="off"></label><button>Send</button></form><small>Camera and microphone are not implemented yet. Netflix controls are experimental.</small></section>`;
  const $ = id => root.getElementById(id);
  let ws, code, ready = false, suppressUntil = 0, video, contentId, lastSequence = 0, members = [];
  const status = text => { $('status').textContent = text; };
  const log = text => { const line = document.createElement('div'); line.textContent = text; $('log').append(line); while ($('log').children.length > 40) $('log').firstChild.remove(); };
  const service = globalThis.ciltroServices.find(adapter => adapter.id === 'netflix');
  const identify = () => service.identify();
  const send = data => { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); else status('Disconnected — watching independently.'); };
  const eligible = () => ready && members.length === 2 && members.every(p => p.ready && p.video === contentId);
  async function apply(state) {
    if (!state || !video || !ready || !eligible() || state.sequence < lastSequence) return;
    lastSequence = state.sequence; suppressUntil = Date.now() + 1000;
    try {
      // Resync uses the accepted position. Clock-offset and latency correction are pending.
      await service.apply(video, state);
      status(state.playing ? 'Shared play requested — verify both players.' : 'Paused together.');
    } catch { ready = false; send({type: 'ready', ready: false, video: contentId}); status('Playback blocked. Use Netflix’s play button, then Join playback.'); }
  }
  function connect(type) {
    if (!contentId || !video) return status('Open a Netflix video before connecting.');
    if (code || ws?.readyState === WebSocket.CONNECTING) return;
    let url; try { url = new URL($('endpoint').value); if (!['ws:', 'wss:'].includes(url.protocol) || (url.protocol === 'ws:' && !['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error(); } catch { return status('Use wss:// for a hosted server, or ws://localhost:8787 locally.'); }
    ws = new WebSocket(url);
    ws.onopen = () => send({type, code: $('code').value.trim(), video: contentId});
    ws.onmessage = event => {
      let m; try { m = JSON.parse(event.data); } catch { return; }
      if (m.type === 'joined') { code = m.code; lastSequence = 0; $('code').value = code; status('Room joined. Both people must select Join playback.'); }
      if (m.type === 'presence') { members = m.members; status(members.length < 2 ? 'Waiting for partner.' : members.some(p => p.video !== contentId) ? 'Open the same Netflix video.' : eligible() ? 'Both ready for shared controls.' : 'Waiting for both people to join playback.'); }
      if (m.type === 'playback') { if (m.state) void apply(m.state); else status('No shared playback position yet. Both join playback, then use Netflix’s controls.'); }
      if (m.type === 'error') status(m.message);
      if (m.type === 'chat') log(m.text);
    };
    ws.onclose = () => { ready = false; code = null; members = []; status('Disconnected — watching independently. Rejoin using the code.'); };
    ws.onerror = () => status('Could not reach the coordination server.');
  }
  const act = action => { if (eligible() && Date.now() > suppressUntil && !video.seeking) send({type: 'action', action, position: video.currentTime, playing: !video.paused}); };
  function detect() {
    const next = identify(), player = service.player();
    if (next !== contentId || player !== video) {
      if (ready) { ready = false; send({type: 'ready', ready: false, video: next}); }
      if (video) for (const name of ['play', 'pause', 'seeked']) video.removeEventListener(name, onControl);
      contentId = next; video = player;
      if (video) for (const name of ['play', 'pause', 'seeked']) video.addEventListener(name, onControl);
      status(next && player ? `Video detected (${next}). Create or join a room.` : 'Open a Netflix video.');
    }
    $('create').disabled = !contentId || !video || !!code;
    $('join').disabled = !contentId || !video || !!code;
  }
  function onControl(event) { act(event.type === 'seeked' ? 'seek' : event.type); }
  $('close').onclick = () => { host.style.display = 'none'; };
  $('create').onclick = () => connect('create'); $('join').onclick = () => connect('join');
  $('copy').onclick = async () => { try { await navigator.clipboard.writeText($('code').value); log('Code copied.'); } catch { $('code').focus(); $('code').select(); status('Select and copy the code manually.'); } };
  $('ready').onclick = () => { if (!code || !video) return status('Join a room first.'); ready = true; send({type: 'ready', ready: true, video: contentId}); };
  $('resync').onclick = () => send({type: 'resync'});
  $('leave').onclick = () => { ready = false; send({type: 'leave'}); ws?.close(); code = null; lastSequence = 0; };
  $('chat').onsubmit = event => { event.preventDefault(); if (!code) return status('Join a room first.'); send({type: 'chat', text: $('message').value}); $('message').value = ''; };
  chrome.runtime.onMessage.addListener(m => { if (m.type === 'ciltro:toggle') { host.style.display = host.style.display === 'none' ? 'block' : 'none'; detect(); } });
  setInterval(detect, 1500); detect();
})();
