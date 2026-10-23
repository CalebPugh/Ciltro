import test from 'node:test';
import assert from 'node:assert/strict';
import { Rooms } from '../server/rooms.js';
const video = 'netflix:123456';
function pair(rooms) {
  const a = {video, ready: true}, b = {video, ready: true};
  const {code} = rooms.create(a, video); rooms.join(b, code);
  return {a, b, code};
}
test('rooms require a recognized Netflix identifier and admit only two people', () => {
  const rooms = new Rooms();
  assert.throws(() => rooms.create({}, 'A similar title'));
  const {code} = pair(rooms);
  assert.throws(() => rooms.join({}, code), /full/);
  assert.throws(() => rooms.join({}, 'unknown'), /Invalid/);
  assert.equal(rooms.rooms.get(code).members.size, 2);
});
test('server orders simultaneous actions and room members converge on the last accepted state', () => {
  const rooms = new Rooms({now: () => 100}); const {a, b, code} = pair(rooms);
  const first = rooms.action(a, {action: 'play', position: 10});
  const second = rooms.action(b, {action: 'pause', position: 11});
  assert.equal(first.sequence, 1); assert.equal(second.sequence, 2);
  assert.deepEqual(rooms.rooms.get(code).state, {action: 'pause', playing: false, position: 11, sequence: 2, at: 100});
});
test('mismatched or unready participants block controls and invalid commands cannot mutate state', () => {
  const rooms = new Rooms(); const {a, b, code} = pair(rooms);
  b.video = 'netflix:999'; assert.throws(() => rooms.action(a, {action: 'play', position: 3}), /same video/);
  b.video = video; b.ready = false; assert.throws(() => rooms.action(a, {action: 'play', position: 3}));
  b.ready = true;
  for (const bad of [{action: 'seek', position: -1}, {action: 'play', position: NaN}, {action: 'delete', position: 0}]) assert.throws(() => rooms.action(a, bad));
  assert.equal(rooms.rooms.get(code).state, null);
});
test('outsiders cannot control rooms and leaving immediately revokes control', () => {
  const rooms = new Rooms(); const {a, code} = pair(rooms);
  assert.throws(() => rooms.action({code}, {action: 'pause', position: 1}));
  rooms.leave(a); assert.throws(() => rooms.action(a, {action: 'pause', position: 1}));
  assert.equal(rooms.rooms.get(code).members.size, 1);
});
test('empty rooms expire after ten minutes; active rooms remain', () => {
  let now = 0; const rooms = new Rooms({now: () => now}); const {a, b, code} = pair(rooms);
  rooms.leave(a); now = 700000; rooms.sweep(); assert.ok(rooms.rooms.has(code));
  rooms.leave(b); now += 600001; rooms.sweep(); assert.equal(rooms.rooms.has(code), false);
});
test('rejoining an empty room cancels its inactivity expiry', () => {
  let now = 0; const rooms = new Rooms({now: () => now});
  const {a, b, code} = pair(rooms); rooms.leave(a); rooms.leave(b);
  now = 599999; rooms.join({video}, code);
  now = 700000; rooms.sweep(); assert.ok(rooms.rooms.has(code));
});
