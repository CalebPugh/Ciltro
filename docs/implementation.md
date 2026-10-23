# Implementation checklist

Agreed scope: Ciltro, desktop Chrome for macOS and Windows, Netflix with ad-free plans, two participants, text/voice/video chat; future services through adapters. Reference: Ciltro Product Requirements v0.1 and supplied Teleparty interaction screenshots. No Figma frames supplied yet.

## Confirmed invitation requirement

Entering a valid room code and clicking Join must resolve the room's exact Netflix content ID, open that title in the selected tab, and automatically join the accepted playback position and play/pause state once the player is available. Finding the same title manually must not be a prerequisite. An invitation link should provide the equivalent flow after installation. Creating a room still requires a recognized Netflix video.

Joining is the user's explicit consent to follow playback; do not require a redundant Join playback click for this initial invitation flow. Show an actionable local click only when Chrome or Netflix blocks playback. Netflix login, subscription, region and content restrictions remain enforced. Validate the invitation and capacity before navigating; invalid, expired or full rooms must not navigate. Preserve the join intent across navigation, bind it to the selected tab, and handle wrong content or navigation failure clearly. A matching video already open should be reused. Reconnection after independent viewing still requires explicit rejoin confirmation.

This user-confirmed requirement supersedes the original manual-open/initial Join playback flow. **Not implemented yet:** the prototype currently requires a matching video to be open and a separate Join playback click. Add acceptance coverage for code entry from a browse page, exact episode navigation, an already-open matching video, late join into active playback, login/access/autoplay blocks, and invalid/expired/full invitations. Real Netflix acceptance remains unverified.

## Milestone 1 — Netflix feasibility (in progress)

- [x] MV3 extension and Netflix-only adapter scaffold (RQ01, RQ08).
- [x] Detect `/watch/<id>` and expose experimental HTML-video read/control methods.
- [ ] Verify actual Netflix identification, play, pause, seeking and event observation on both operating systems. No signed-in service testing has occurred.
- [ ] Verify protected playback, player replacement, navigation, fullscreen and autoplay restrictions (AT09, AT11, AT16).
- [ ] Decide whether the current adapter is viable before committing to full playback UI.

## Milestones 2–3 — Rooms and first synchronization slice

- [x] Local coordination service, random invitation code, maximum two members, room-scoped commands (RQ02, RQ04, AT03, AT20; automated checks).
- [x] Canonical server action order, input validation, mismatch/readiness gates (RQ10, RQ15; automated checks).
- [x] Initial create/join/copy/leave UI, explicit Join playback and text chat.
- [x] Experimental playback forwarding, remote event suppression and manual resync.
- [ ] Validate browser behavior against actual Netflix controls (AT04–07, AT10).
- [ ] Accurate resync position projection, RTT/clock-offset estimation, drift correction (RQ17–18).
- [ ] Configure private TLS hosting and prove separate-network use (AT01, AT25/RQ25).
- [ ] Show content titles, invitation links and installation landing page.
- [x] Implement opt-in voice/video, local/remote camera tiles, independent mic/camera toggles, explicit end-call, and sender-labelled text chat (RQ31–32). Device tracks are stopped on disable, call end, room leave, page exit and coordination close.
- [x] Implement room-scoped WebRTC signaling, one offerer per call, stale-call rejection, and configurable ICE servers.
- [ ] Verify actual received voice/video on physical devices and Netflix. Browser-level capture permissions/Permissions Policy, direct media and TURN connectivity are not release-validated.
- [ ] Provision secure coordination hosting and an appropriate STUN/TURN relay for separate networks. Hosting/provider and costs remain undecided; no paid activation authorized.

## Milestone 4 — Recovery

- [ ] Two-minute reconnect reservations and automatic transport reconnection.
- [ ] Preserve membership over refresh; require explicit rejoin playback (AT12–14).
- [ ] Explicit one-tab ownership, player closure and episode change confirmation (RQ11–12).
- [ ] Buffering pause/resume and deliberate-pause protection (RQ19).
- [ ] Ads and interruptions, heartbeat and stale-connection detection (RQ22–23).
- [x] Local independent playback after connection closure; empty room cleanup (server tests).

## Milestone 5 — Acceptance and packaging

- [x] Initial navy-and-grey panel redesign: state-specific setup/room screens, compact invitation and playback actions, participant rows, bounded scrollable chat, and connection settings behind a header control.
- [ ] Final sidebar design, all screen states, keyboard and screen-reader review (AT19).
- [ ] 30-minute timing measurements, full movie, two computers on different networks (AT17–18).
- [ ] Distribution folder, hosted service deployment, costs and user guide.

Thirteen automated tests currently cover server room/call invariants and actual local WebSocket transport. These do not establish Netflix, physical-device media, cross-network, or release acceptance results. No service accounts or credentials are required by the automated suite.

Panel update validation: Chromium fixture pages (not signed-in Netflix) with the real local WebSocket server exercised create, invalid invite, join, chat, readiness, close/reopen, leave, and connection settings without page errors. The panel, composer and Leave control stayed within 1280×720, 800×480 and 390×600 viewports. Local-network permission was granted for the test origin. This does not verify Netflix playback or OS-specific behavior.

Voice/video validation: `npm test` passes 13 tests, including server call authorization, signal forwarding, role selection, malformed/stale signals and teardown. `python test/browser/check_calls.py --signaling-only` passes fixture-browser checks for synthetic-device opt-in, permission denial, two-way send/receive SDP negotiation, mute/unmute, camera on/off, end/rejoin, leave/disconnect cleanup, safe text rendering, sender labels and responsive bounds. **RTP audio, decoded remote video and connected-media assertions are skipped in this mode.** The default full browser test attempted here failed to establish media: this machine's managed Chromium `WebRtcIPHandling` policy disables non-proxied UDP and produced no ICE candidates, including with a loopback TCP TURN experiment. The policy was left unchanged. End-to-end media and Netflix checks remain unverified; see docs/calls.md.
