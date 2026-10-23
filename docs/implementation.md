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
- [ ] Add camera/microphone with explicit permission and independent mute/disable controls. Proposed: WebRTC media, existing server for signaling, STUN and TURN for reliable connections. Hosting/provider and costs remain undecided; no paid activation authorized.

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

Seven automated tests currently cover server room invariants and actual local WebSocket transport. These do not establish any Netflix, browser UI, cross-network, camera/microphone, or release acceptance result. No service accounts or credentials are required by the automated suite.

Panel update validation: Chromium fixture pages (not signed-in Netflix) with the real local WebSocket server exercised create, invalid invite, join, chat, readiness, close/reopen, leave, and connection settings without page errors. The panel, composer and Leave control stayed within 1280×720, 800×480 and 390×600 viewports. Local-network permission was granted for the test origin. This does not verify Netflix playback or OS-specific behavior.
