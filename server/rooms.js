import { randomBytes } from 'node:crypto';

export class Rooms {
  constructor({now = Date.now} = {}) { this.rooms = new Map(); this.now = now; }
  create(peer, video) {
    if (peer.code) throw new Error('Leave your current room first.');
    this.sweep();
    if (this.rooms.size >= 1000) throw new Error('Room capacity reached. Try again later.');
    if (!/^netflix:\d+$/.test(video ?? '')) throw new Error('Open a Netflix video first.');
    const code = randomBytes(18).toString('base64url');
    this.rooms.set(code, {video, members: new Set(), sequence: 0, state: null, emptySince: null});
    return this.join(peer, code);
  }
  join(peer, code) {
    const room = this.rooms.get(code);
    if (!room) throw new Error('Invalid or expired invitation.');
    if (room.members.size >= 2) throw new Error('This room is full.');
    if (peer.code) throw new Error('Leave your current room first.');
    room.members.add(peer); room.emptySince = null; peer.code = code;
    return {code, video: room.video, state: room.state};
  }
  action(peer, message) {
    const room = this.rooms.get(peer.code);
    if (!room?.members.has(peer)) throw new Error('Join a room first.');
    if (room.members.size !== 2 || [...room.members].some(p => !p.ready || p.video !== room.video)) throw new Error('Both people must join playback with the same video.');
    if (!['play', 'pause', 'seek'].includes(message.action) || !Number.isFinite(message.position) || message.position < 0 || message.position > 86400) throw new Error('Invalid playback action.');
    room.state = {action: message.action, position: message.position, playing: message.action === 'play' || (message.action === 'seek' && !!message.playing), sequence: ++room.sequence, at: this.now()};
    return room.state;
  }
  leave(peer) {
    const room = this.rooms.get(peer.code);
    if (room) { room.members.delete(peer); if (!room.members.size) room.emptySince = this.now(); }
    peer.code = null; peer.ready = false;
  }
  sweep() { for (const [code, room] of this.rooms) if (room.emptySince !== null && this.now() - room.emptySince > 600000) this.rooms.delete(code); }
}
