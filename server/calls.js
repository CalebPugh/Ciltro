import {randomUUID} from 'node:crypto';

export const inactiveMedia = () => ({joined: false, microphone: false, camera: false});

export function readIceServers(raw) {
  if (!raw) return [];
  let servers;
  try { servers = JSON.parse(raw); }
  catch { throw new Error('RTC_ICE_SERVERS_JSON must contain valid JSON.'); }
  if (!Array.isArray(servers) || servers.length > 8) throw new Error('RTC_ICE_SERVERS_JSON must be an array of up to eight ICE servers.');
  return servers.map(server => {
    if (!server || typeof server !== 'object') throw new Error('Invalid ICE server configuration.');
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    if (!urls.length || urls.length > 8 || urls.some(url => typeof url !== 'string' || url.length > 512 || !/^(stun|stuns|turn|turns):[^\s]+$/.test(url))) throw new Error('Invalid ICE server URL.');
    const result = {urls};
    for (const key of ['username', 'credential']) {
      if (server[key] !== undefined) {
        if (typeof server[key] !== 'string' || server[key].length > 1024) throw new Error('Invalid ICE credential configuration.');
        result[key] = server[key];
      }
    }
    return result;
  });
}

export class Calls {
  constructor({send, iceServers = []}) { this.send = send; this.iceServers = iceServers; }
  end(room, reason) {
    if (!room || (!room.call && ![...room.members].some(p => p.media?.joined))) return;
    room.call = null;
    for (const peer of room.members) {
      peer.media = inactiveMedia();
      this.send(peer, {type: 'call-ended', reason});
    }
  }
  handle(room, peer, m) {
    if (!room?.members.has(peer)) throw new Error('Join a room first.');
    if (m.type === 'call-join' || m.type === 'call-state') {
      if (typeof m.microphone !== 'boolean' || typeof m.camera !== 'boolean') throw new Error('Invalid microphone or camera state.');
      if (m.type === 'call-state' && !peer.media?.joined) throw new Error('Join the call first.');
      peer.media = {joined: true, microphone: m.microphone, camera: m.camera};
      const participants = [...room.members];
      if (!room.call && participants.length === 2 && participants.every(p => p.media?.joined)) {
        room.call = {id: randomUUID()};
        participants.forEach((p, index) => this.send(p, {type: 'call-start', callId: room.call.id, offerer: index === 0, iceServers: this.iceServers}));
      }
    } else if (m.type === 'call-leave') {
      this.end(room, 'Call ended. Your camera and microphone are off.');
    } else if (m.type === 'signal') {
      if (!room.call || m.callId !== room.call.id || !peer.media?.joined) throw new Error('Call is no longer active.');
      const target = [...room.members].find(p => p !== peer && p.media?.joined);
      if (!target) throw new Error('Your partner is not in the call.');
      const signal = m.signal;
      if (!signal || typeof signal !== 'object') throw new Error('Invalid call signal.');
      let safe;
      if (signal.description) {
        const {type, sdp} = signal.description;
        if (!['offer', 'answer'].includes(type) || typeof sdp !== 'string' || sdp.length > 24000) throw new Error('Invalid call description.');
        safe = {description: {type, sdp}};
      } else if (signal.candidate) {
        const {candidate, sdpMid, sdpMLineIndex, usernameFragment} = signal.candidate;
        if (typeof candidate !== 'string' || candidate.length > 4096 || (sdpMid !== null && (typeof sdpMid !== 'string' || sdpMid.length > 128)) || (sdpMLineIndex !== null && (!Number.isInteger(sdpMLineIndex) || sdpMLineIndex < 0 || sdpMLineIndex > 16)) || (usernameFragment != null && (typeof usernameFragment !== 'string' || usernameFragment.length > 256))) throw new Error('Invalid ICE candidate.');
        safe = {candidate: {candidate, sdpMid, sdpMLineIndex, ...(usernameFragment == null ? {} : {usernameFragment})}};
      } else throw new Error('Invalid call signal.');
      this.send(target, {type: 'signal', callId: room.call.id, signal: safe});
    } else throw new Error('Unknown call request.');
  }
}
