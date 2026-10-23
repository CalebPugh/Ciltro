# Ciltro

Private watch-together Chrome extension for two people. Initial target: **Netflix ad-free, desktop Chrome on macOS and Windows**. HBO Max and other services are future adapters.

This is an early feasibility build, not a finished release. It has a Netflix player adapter, an extension panel, a local coordination server, two-person rooms, explicit playback opt-in, ordered play/pause/seek commands, manual resync, text chat, and room expiry. Netflix playback compatibility has **not** been verified on a signed-in account. Camera/microphone calling is not implemented.

## Develop

Use Node.js 22 or newer (validated here with Node 24.19.0).

```sh
cd /workspace/Ciltro
npm ci --cache /tmp/ciltro-npm-cache
npm test
npm run check
npm start
```

On your own computer, use the folder where you cloned the repository instead of `/workspace/Ciltro`. The coordination server binds to `127.0.0.1:8787`; `GET /health` returns `{"ok":true}`. `PORT` and `HOST` override the listening address. No database or credentials are needed for local development. Room state exists only in memory and is lost on server restart. Tests start their own server on port 18787.

## Load the extension (Mac or Windows)

1. Open Chrome's `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select this repository's `extension` folder.
2. Pin Ciltro in the extensions menu. Open and manually play an ad-free Netflix movie or episode.
3. Click Ciltro. Keep `ws://localhost:8787` for local testing with a server running on that same computer.
4. Create a room and copy its code. In a second Chrome profile, open the exact same Netflix video, open Ciltro, enter the code, and join.
5. Both people explicitly select **Join playback**. Use Netflix's normal controls and verify the other player follows. This is a feasibility experiment, not proof of service support.
6. Leave stops shared commands without pausing local playback. Closing the panel keeps the active page connection alive.

The navy-and-grey panel overlays the right edge of the page and fits within the viewport. Connection settings are under the sliders button in its header; room controls replace setup after joining. Resizing the video into a dedicated sidebar, fullscreen support, and final visual design remain future work.

### Two physical computers

A localhost server cannot connect two separate networks. That requires deploying this server behind HTTPS/WebSocket TLS on a host you choose, and entering its `wss://` endpoint on each computer. No hosting has been provisioned and no paid services have been activated. Keep the prototype private; production deployment needs heartbeat/liveness handling, abuse protection, diagnostics policy, and reconnection work first. No cross-network test has been performed.

### Permissions and privacy

The extension's content script is limited to `https://www.netflix.com/*`; `activeTab` supports the toolbar action. It does not read Netflix cookies, credentials, or send video content. The server receives room codes, content IDs, readiness, playback state and text messages. Codes are bearer secrets: anyone holding one can join an available slot. Do not post them publicly. The app writes no message or room-code logs, has no analytics, and stores room state only in memory. Empty rooms expire after ten minutes. Your hosting provider may retain network logs independently.

## Architecture and adding services

- `extension/services/netflix.js`: service-specific recognition and experimental HTML video operations. Netflix may require a different supported integration if these operations fail.
- `extension/content.js`: room and panel UI, playback event forwarding, remote-event suppression, text chat.
- `extension/background.js`: toolbar activation; room lifetime currently belongs to the video page.
- `server/rooms.js`: private room membership, capacity, canonical action order, validation and expiry.
- `server/index.js`: HTTP health and bounded WebSocket message transport.

To add a service later, implement its adapter, explicitly add its domain and script to the manifest, extend server content-ID validation, and run that service's own feasibility and acceptance checks. Do not simply enable arbitrary domains. Current selection is intentionally Netflix-only.

## Required invitation flow (pending)

The finished flow must accept a room code, open the room's exact Netflix movie or episode, and join its current playback automatically after the user clicks Join. Manual title selection and a second initial Join playback click are prototype limitations, not the intended product. Netflix access and browser autoplay restrictions may require user action. See the confirmed requirement in docs/implementation.md.

## Known gaps

See [implementation checklist](docs/implementation.md) and [Netflix feasibility procedure](docs/netflix-feasibility.md). Refresh recovery, reconnect reservations, tab ownership across multiple tabs, buffering coordination, ad detection, drift/latency correction, invitation landing pages, camera/microphone calling, and deployment are unfinished. The current Resync uses the last accepted timestamp without elapsed-time extrapolation. Do not claim timing targets or full movie reliability from this prototype.
