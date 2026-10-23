import test from 'node:test';
import assert from 'node:assert/strict';
import {Calls, inactiveMedia, readIceServers} from '../server/calls.js';

function fixture() {
  const a = {media: inactiveMedia()}, b = {media: inactiveMedia()};
  const room = {members: new Set([a, b])}; const messages = [];
  const calls = new Calls({send: (peer, message) => messages.push({peer, message})});
  const join = peer => calls.handle(room, peer, {type: 'call-join', microphone: true, camera: false});
  return {a, b, room, calls, messages, join};
}
test('calls require both members to opt in and select exactly one offerer', () => {
  const f = fixture(); f.join(f.a); assert.equal(f.messages.length, 0);
  f.join(f.b); assert.equal(f.messages.length, 2);
  const [a, b] = f.messages.map(m => m.message);
  assert.equal(a.type, 'call-start'); assert.equal(a.callId, b.callId);
  assert.equal(a.offerer, true); assert.equal(b.offerer, false);
  f.calls.handle(f.room, f.a, {type: 'call-state', microphone: false, camera: true});
  assert.equal(f.messages.length, 2); assert.equal(f.a.media.camera, true);
});
test('signaling goes only to the other opted-in member and strips unknown fields', () => {
  const f = fixture(); f.join(f.a); f.join(f.b); f.messages.length = 0;
  f.calls.handle(f.room, f.a, {type: 'signal', callId: f.room.call.id, signal: {description: {type: 'offer', sdp: 'v=0', injected: 'ignored'}, target: 'outsider'}});
  assert.equal(f.messages.length, 1); assert.equal(f.messages[0].peer, f.b);
  assert.deepEqual(f.messages[0].message.signal, {description: {type: 'offer', sdp: 'v=0'}});
});
test('nonmembers, stale call IDs and signals before mutual opt-in are rejected', () => {
  const f = fixture(); f.join(f.a);
  assert.throws(() => f.calls.handle(f.room, {}, {type: 'call-join', microphone: true, camera: true}), /Join a room/);
  assert.throws(() => f.calls.handle(f.room, f.a, {type: 'signal', callId: 'old'}), /no longer active/);
  f.join(f.b);
  assert.throws(() => f.calls.handle(f.room, f.a, {type: 'signal', callId: 'old'}), /no longer active/);
});
test('malformed and oversized call signals cannot reach the partner', () => {
  const f = fixture(); f.join(f.a); f.join(f.b); f.messages.length = 0;
  for (const signal of [{description: {type: 'rollback', sdp: 'v=0'}}, {description: {type: 'offer', sdp: 'x'.repeat(24001)}}, {candidate: {candidate: 'x', sdpMid: 42, sdpMLineIndex: 0}}, {}]) {
    assert.throws(() => f.calls.handle(f.room, f.a, {type: 'signal', callId: f.room.call.id, signal}), /Invalid/);
  }
  assert.equal(f.messages.length, 0);
});
test('ending a call clears both members and invalidates old signaling', () => {
  const f = fixture(); f.join(f.a); f.join(f.b); const oldId = f.room.call.id;
  f.calls.end(f.room, 'Ended');
  assert.equal(f.room.call, null); assert.deepEqual(f.a.media, inactiveMedia()); assert.deepEqual(f.b.media, inactiveMedia());
  assert.equal(f.messages.filter(m => m.message.type === 'call-ended').length, 2);
  f.join(f.a); f.join(f.b); assert.notEqual(f.room.call.id, oldId);
  assert.throws(() => f.calls.handle(f.room, f.a, {type: 'signal', callId: oldId}), /no longer active/);
});
test('ICE configuration preserves configured relay credentials without adding default destinations', () => {
  assert.deepEqual(readIceServers(), []);
  assert.deepEqual(readIceServers('[{"urls":"stun:stun.example.com:3478"}]'), [{urls: ['stun:stun.example.com:3478']}]);
  assert.throws(() => readIceServers('[{"urls":"https://example.com"}]'), /Invalid/);
  assert.throws(() => readIceServers('{}'), /array/);
  assert.throws(() => readIceServers('[null]'), /Invalid/);
  assert.throws(() => readIceServers('{"credential":"sensitive-marker"'), error => error.message === 'RTC_ICE_SERVERS_JSON must contain valid JSON.');
});
