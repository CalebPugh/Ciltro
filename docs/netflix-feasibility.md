# Netflix feasibility procedure — not yet executed

Use two authorized ad-free Netflix accounts/devices capable of independently playing the same on-demand title. Do not share credentials with the development environment. Test on current Chrome for macOS and Windows; record actual browser and OS versions.

1. Load the unpacked extension using README instructions. Start the local server and confirm `/health` responds.
2. Open a Netflix title, manually initiate playback, and confirm the panel recognizes its numeric watch ID. Test a movie and a specific episode; similar titles are not enough.
3. Create/join a room with the same exact watch ID. Opt in to playback on both sides.
4. Play, pause, seek forward/backward, and scrub repeatedly on each side. Record whether Netflix actually follows the requests, whether its native UI matches, and whether commands bounce or loop. The current adapter uses HTML media methods; compatibility must be observed, not assumed.
5. Load a wrong episode; verify commands are suspended. Navigate to another episode; verify readiness resets.
6. Close only the panel; verify page playback synchronization remains. Refresh the video tab: current prototype loses membership (known missing capability).
7. Test browser autoplay denial, fullscreen, captions, volume, and multiple video tabs. Capture limitations without claiming a pass.
8. Stop the server; confirm the panel says watching independently and local controls work.

Record: date, Netflix account plan, title and episode IDs, OS/Chrome versions, action, expected result, actual result, browser-console error text without codes/credentials, and pass/fail/unverified. Do not capture protected video content in reports.

**Exit gate:** basic Netflix identify/read/play/pause/seek must work reliably before expanding the full interface. If direct media operations fail or Netflix blocks the transport, investigate the platform behavior and supported extension architecture. Do not bypass DRM, service access controls, certificate checks, or account restrictions.

After local feasibility, deploy a secure private coordination endpoint and repeat on two physical computers on different networks. That is required to establish release readiness; same-browser profiles cannot substitute for it.
