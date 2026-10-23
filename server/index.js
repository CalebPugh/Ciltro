import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { Rooms } from './rooms.js';
const rooms = new Rooms();
const server = http.createServer((req, res) => {
  res.writeHead(req.url === '/health' ? 200 : 404, {'Content-Type': 'application/json'});
  res.end(JSON.stringify(req.url === '/health' ? {ok: true} : {error: 'Not found'}));
});
const wss = new WebSocketServer({server, maxPayload: 8192});
const send = (peer, payload) => { if (peer.ws.readyState === WebSocket.OPEN) peer.ws.send(JSON.stringify(payload)); };
const broadcast = (code, payload) => { for (const peer of rooms.rooms.get(code)?.members ?? []) send(peer, payload); };
const presence = code => broadcast(code, {type: 'presence', members: [...(rooms.rooms.get(code)?.members ?? [])].map(p => ({ready: !!p.ready, video: p.video}))});
wss.on('connection', (ws, req) => {
  // Browsers may connect only from Netflix. Non-browser clients are allowed for local development tests.
  if (req.headers.origin && req.headers.origin !== 'https://www.netflix.com') return ws.close(1008, 'Unsupported origin');
  const peer = {ws, ready: false}; let windowStart = Date.now(), count = 0;
  ws.on('message', raw => {
    try {
      if (Date.now() - windowStart > 1000) { count = 0; windowStart = Date.now(); }
      if (++count > 40) throw new Error('Too many requests.');
      const m = JSON.parse(raw);
      if (m.type === 'create' || m.type === 'join') {
        if (peer.code) throw new Error('Leave your current room first.');
        peer.video = m.video;
        const result = m.type === 'create' ? rooms.create(peer, m.video) : rooms.join(peer, m.code);
        send(peer, {type: 'joined', ...result}); presence(peer.code);
      } else if (m.type === 'leave') { const code = peer.code; rooms.leave(peer); presence(code); }
      else {
        const room = rooms.rooms.get(peer.code);
        if (!room?.members.has(peer)) throw new Error('Join a room first.');
        if (m.type === 'ready') { peer.video = m.video; peer.ready = !!m.ready; presence(peer.code); if (peer.ready && room.state) send(peer, {type: 'playback', state: room.state}); }
        else if (m.type === 'action') broadcast(peer.code, {type: 'playback', state: rooms.action(peer, m)});
        else if (m.type === 'resync') send(peer, {type: 'playback', state: room.state});
        else if (m.type === 'chat' && typeof m.text === 'string' && m.text.trim() && m.text.length <= 1000) broadcast(peer.code, {type: 'chat', text: m.text.trim()});
        else throw new Error('Unknown request.');
      }
    } catch (error) { send(peer, {type: 'error', message: error.message}); }
  });
  ws.on('close', () => { const code = peer.code; rooms.leave(peer); presence(code); });
  ws.on('error', () => {});
});
setInterval(() => rooms.sweep(), 60000).unref();
const port = Number(process.env.PORT || 8787);
server.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Ciltro coordination listening on port ${port}`));
