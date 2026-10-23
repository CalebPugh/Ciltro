# Voice, video and text chat

The Netflix room panel now has two opt-in actions:

- **Join voice:** request your microphone, leaving your camera off.
- **Join video:** request both microphone and camera and show a local preview.

Both people must opt in before Ciltro connects their devices. Text chat works independently of the call and labels messages as You or Your partner. The call controls let you mute/unmute the mic, switch the camera on/off, and end the call for both people. Turning a device off releases its capture track; turning it back on may request permission again. Your own preview is always muted. Use headphones when testing two profiles on one computer to avoid feedback.

Chrome will ask for device access on the Netflix site because capture happens in the page's content-script panel. No devices are requested during installation or merely joining a room. Mac users may also need to allow Google Chrome under System Settings → Privacy & Security → Camera/Microphone. Windows users may need to allow desktop apps access under Settings → Privacy & security → Camera/Microphone. If Netflix's Permissions Policy blocks capture, this page-based implementation cannot override it; report the error for an extension-origin media surface follow-up. Actual signed-in Netflix/device permission behavior must be tested.

Closing the Ciltro panel keeps the call going. Ending the call, leaving the room, navigating away from the document, or losing coordination stops your capture tracks. Ending/leaving/disconnecting also ends the other participant's call. Joining again requires a fresh explicit action. A temporary WebRTC media interruption gets up to 12 seconds to recover before the call is stopped; this is separate from the unfinished room-reconnection flow.

If Chrome blocks received sound, use **Enable call sound**. Netflix's video volume and captions are unaffected; Ciltro transmits device microphone/camera tracks, not the Netflix stream. Microphones may pick up your speakers, so headphones are recommended.

## Local test on one computer

1. Install the latest extension folder in both Chrome profiles and restart the latest server with `npm start`. Do not use an old server: the new build adds call signaling and participant IDs.
2. Open the same Netflix title in both profiles, create/join a room, then choose Join voice or Join video in each.
3. Grant device permission if desired. Check that voice/video arrives in the other profile. Both profiles may compete for the same physical camera on some systems; a device-busy result is a limitation of that test, not proof that two-computer calls fail.
4. Check text messages, mic mute/unmute, camera off/on, End call and Leave room. The camera-in-use indicator should turn off when all captures of that device are stopped (another profile or app can keep it on).
5. Check permission denial and server shutdown. Neither should leave a hidden active capture. If Chrome blocks local-network access, allow local network access for Netflix in site settings for this local test.

## Transport and hosting

The coordination server only relays room-scoped WebRTC descriptions and ICE candidates; it never receives camera/microphone media through the WebSocket. Media uses WebRTC's encrypted transport. A direct connection exposes normal connection metadata to the other participant. A TURN relay, if configured, forwards encrypted media and sees transport metadata. Room codes remain bearer secrets; share only with your intended partner. SDP, ICE candidates, messages and credentials are not written to application logs or durable storage. Browser and hosting diagnostics are outside that guarantee.

By default `iceServers` is empty: there is no third-party STUN/TURN dependency, and local same-machine/some LAN connections can work. **This default does not promise cross-network calls.** Use a hosted WSS coordination endpoint and a STUN/TURN service for reliable Internet use. No hosting or paid relay has been activated.

The server supports `RTC_ICE_SERVERS_JSON`, a JSON array in the standard WebRTC ICE-server format. A noncredential example is:

```json
[{"urls":["stun:stun.example.com:3478"]}]
```

For TURN, provision appropriate `turn:`/`turns:` URLs and scoped, short-lived `username` and `credential` values through your deployment's secret handling. Never commit those values or paste them into chat. The server shares this configuration with the two opted-in room members because the browser needs it for ICE. This prototype accepts configured credentials as supplied; automated short-lived credential issuance is not implemented. Do not configure permanent privileged credentials. An invalid configuration fails server startup instead of silently weakening transport.

## Automated checks

`npm test` covers room and call signaling invariants, membership, malformed signals, stale call IDs, roles and teardown. It needs no camera, Netflix account, or third-party service.

An optional Chromium test exercises actual WebRTC with synthetic media devices and mock Netflix pages. It does **not** establish Netflix compatibility or real-world acceptance. With Python 3 and Playwright installed:

```sh
python3 -m venv /tmp/ciltro-browser-venv
/tmp/ciltro-browser-venv/bin/pip install playwright
/tmp/ciltro-browser-venv/bin/playwright install chromium
/tmp/ciltro-browser-venv/bin/python test/browser/check_calls.py
```

It uses a dedicated coordination port (18878). Real macOS/Windows hardware, Netflix permissions policy, different networks, relay paths, browser autoplay and long-session call quality remain separate acceptance checks.

### Cloud validation limits

In this cloud environment, the default full browser check did not establish media. Managed Chromium sets `WebRtcIPHandling` to `disable_non_proxied_udp`, and ICE gathering produced zero candidates even when a loopback TCP TURN endpoint was supplied. No browser policy was changed. Synthetic capture and SDP negotiation can still be checked here:

```sh
python test/browser/check_calls.py --signaling-only
```

That mode explicitly skips RTP audio, video decoding and connected-media checks; a pass is **not** a successful voice/video call. The default full test retains those assertions for a suitable browser/network. `CILTRO_TEST_ICE_SERVERS_JSON` can supply test-only ICE configuration; do not put real credentials in shell history or logs. No hosted relay or real-world network path was validated.
