import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {WebSocket} from 'ws';

function inbox(ws) {
  const queue = [], waiters = [];
  ws.on('message', raw => { const m = JSON.parse(raw); if (waiters.length) waiters.shift()(m); else queue.push(m); });
  return () => queue.length ? Promise.resolve(queue.shift()) : new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Message timed out')), 3000);
    waiters.push(m => { clearTimeout(timer); resolve(m); });
  });
}
test('real WebSockets create/join, broadcast controls and chat, reject a third participant', {timeout: 10000}, async t => {
  const child = spawn(process.execPath, ['server/index.js'], {env: {...process.env, PORT: '18787'}, stdio: ['ignore', 'pipe', 'pipe']});
  t.after(() => child.kill());
  await once(child.stdout, 'data');
  const response = await fetch('http://127.0.0.1:18787/health'); assert.deepEqual(await response.json(), {ok: true});
  const peers = [];
  async function client() { const ws = new WebSocket('ws://127.0.0.1:18787', {origin: 'https://www.netflix.com'}); peers.push(ws); const next = inbox(ws); await once(ws, 'open'); return {ws, next, send: m => ws.send(JSON.stringify(m))}; }
  t.after(() => peers.forEach(ws => ws.terminate()));
  const a = await client(), b = await client(), c = await client();
  a.send({type: 'create', video: 'netflix:123'}); const joined = await a.next(); assert.equal(joined.type, 'joined'); await a.next();
  b.send({type: 'join', code: joined.code, video: 'netflix:123'}); assert.equal((await b.next()).type, 'joined'); await a.next(); await b.next();
  c.send({type: 'join', code: joined.code, video: 'netflix:123'}); assert.match((await c.next()).message, /full/);
  a.send({type: 'ready', ready: true, video: 'netflix:123'}); await a.next(); await b.next();
  b.send({type: 'ready', ready: true, video: 'netflix:123'}); await a.next(); await b.next();
  a.send({type: 'action', action: 'play', position: 15}); const one = await a.next(), two = await b.next(); assert.deepEqual(one, two); assert.equal(one.state.playing, true);
  b.send({type: 'chat', text: 'Hello together', sender: 'spoofed'});
  const chat = await a.next(); assert.equal(chat.text, 'Hello together'); assert.notEqual(chat.sender, 'spoofed'); await b.next();
  c.send({type: 'action', action: 'pause', position: 5}); assert.match((await c.next()).message, /Join a room/);
  a.send({type: 'call-join', microphone: true, camera: false});
  assert.equal((await a.next()).type, 'presence'); await b.next();
  b.send({type: 'call-join', microphone: true, camera: true});
  const callA = await a.next(), callB = await b.next();
  assert.equal(callA.type, 'call-start'); assert.equal(callA.callId, callB.callId);
  assert.equal(callA.offerer, true); assert.equal(callB.offerer, false);
  await a.next(); await b.next();
  a.send({type: 'signal', callId: callA.callId, signal: {description: {type: 'offer', sdp: 'v=0'}}});
  assert.equal((await b.next()).signal.description.type, 'offer');
  c.send({type: 'signal', callId: callA.callId, signal: {description: {type: 'offer', sdp: 'v=0'}}});
  assert.match((await c.next()).message, /Join a room/);
  a.send({type: 'call-leave'});
  assert.equal((await a.next()).type, 'call-ended'); assert.equal((await b.next()).type, 'call-ended');
  await a.next(); await b.next();
  a.send({type: 'signal', callId: callA.callId, signal: {description: {type: 'offer', sdp: 'v=0'}}});
  assert.match((await a.next()).message, /no longer active/);
  b.send({type: 'leave'}); assert.equal((await a.next()).members.length, 1);
});
