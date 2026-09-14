import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { PNG } from 'pngjs';
import { Server } from 'socket.io';
import { io as client } from 'socket.io-client';
import { WebSocket, WebSocketServer } from 'ws';
import { registerYjsUpgrade } from '../services/yjsAccess.js';

process.env.CODEFORA_LOCAL_MODE = 'true';
const { createRelay, updateRelay, relayWorkspace, publicRelay, finishRelaySelection, createRelayController } = await import('../services/relayService.js');
const { RoomService } = await import('../services/roomService.js');
const { createApp } = await import('../app.js');
const { registerCollaborationSocket } = await import('../sockets/collaborationSocket.js');

const owner = { uid: 'alice', name: 'Alice' }, peer = { uid: 'bob', name: 'Bob' };
function room(mode = 'dsa') { return { id: 'CF-RELAY', name: 'Relay test', ownerUserId: owner.uid, max: 2, inviteCode: 'INVITE', hostToken: 'host', users: [], messages: [], history: [], files: [], relay: createRelay(mode) }; }
function action(value, user, body, now = 100) { return updateRelay(value, user, body, now); }
function selecting(value) {
  for (const user of [owner, peer]) { action(value, user, { action: 'join', inviteCode: 'INVITE' }); action(value, user, { action: 'ready', ready: true }); }
  action(value, owner, { action: 'start' });
}
function building(mode) {
  const value = room(mode); selecting(value);
  action(value, owner, { action: 'claim', taskId: value.relay.tasks[0].id });
  action(value, peer, { action: 'claim', taskId: value.relay.tasks[1].id });
  finishRelaySelection(value, 15100); return value;
}
function response() { return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
const request = (user, body = {}) => ({ params: { id: 'CF-RELAY' }, firebaseUser: user, body });

test('Relay waits for a full ready team and enforces the server 15-second choice window', () => {
  const value = room();
  assert.equal(action(value, owner, { action: 'join' }), true);
  assert.equal(action(value, owner, { action: 'join' }), false);
  assert.throws(() => action(value, owner, { action: 'start' }), /full team/);
  action(value, peer, { action: 'join', inviteCode: 'INVITE' });
  assert.throws(() => action(value, peer, { action: 'start' }), /host/);
  for (const user of [owner, peer]) action(value, user, { action: 'ready', ready: true });
  action(value, owner, { action: 'start', selectionEndsAt: 999999 });
  assert.equal(value.relay.selectionEndsAt, 15100);
  assert.deepEqual(relayWorkspace(value, owner.uid, 15099).files, []);
  action(value, owner, { action: 'claim', taskId: 'sum' }, 15099);
  assert.throws(() => action(value, peer, { action: 'claim', taskId: 'even', now: 101 }, 15100), /15 seconds/);
  assert.throws(() => action(value, owner, { action: 'start' }, 15100), /restarted/);
});

test('selection allows one task each, rejects collisions, auto-assigns missed choices and shares leftovers', () => {
  const value = room(); selecting(value);
  action(value, owner, { action: 'claim', taskId: 'sum' });
  assert.throws(() => action(value, peer, { action: 'claim', taskId: 'sum' }), /already selected/);
  action(value, owner, { action: 'claim', taskId: 'maximum' });
  assert.equal(value.relay.tasks.filter(task => task.ownerId === owner.uid).length, 1);
  assert.equal(finishRelaySelection(value, 15099), false);
  assert.equal(finishRelaySelection(value, 15100), true);
  assert.equal(value.relay.tasks.find(task => task.ownerId === peer.uid).id, 'sum');
  assert.equal(value.relay.tasks.filter(task => task.ownerId === null).length, 2);
  assert.equal(finishRelaySelection(value, 15101), false);
});

test('Relay leave releases work, transfers host controls, and exposes presence safely', () => {
  const value = building();
  value.relay.members.forEach(member => { member.online = true; });
  const ownedByPeer = value.relay.tasks.find(task => task.ownerId === peer.uid);
  assert.equal(action(value, owner, { action: 'transfer_host', targetUserId: peer.uid }), true);
  assert.equal(value.ownerUserId, peer.uid);
  assert.equal(action(value, peer, { action: 'remove', targetUserId: owner.uid }), true);
  assert.equal(value.relay.members.some(member => member.userId === owner.uid), false);
  assert.equal(value.relay.members.every(member => member.ready === false), true);
  assert.equal(value.relay.tasks.find(task => task.id === ownedByPeer.id)?.ownerId, peer.uid);
  assert.equal(publicRelay(value.relay).members.length, 1);
  assert.equal(action(value, peer, { action: 'leave' }), true);
  assert.equal(value.relay.status, 'ENDED');
});

test('only the host can rotate the Relay invite and old codes stop resolving', () => {
  const value = room();
  action(value, owner, { action: 'join' });
  const oldCode = value.inviteCode;
  action(value, peer, { action: 'join', inviteCode: oldCode });
  assert.throws(() => action(value, peer, { action: 'regenerate_invite' }), /host can manage/);
  assert.equal(action(value, owner, { action: 'regenerate_invite' }), true);
  assert.notEqual(value.inviteCode, oldCode);
  assert.throws(() => action({ ...value, relay: structuredClone(value.relay) }, { uid: 'outsider', name: 'Outsider' }, { action: 'join', inviteCode: oldCode }), /valid Relay invite/);
});

test('assigned source is hidden from teammates including host; outsiders cannot read or edit', () => {
  const value = building();
  value.relay.tasks[0].code = 'ALICE_SECRET'; value.relay.tasks[1].code = 'BOB_SECRET';
  assert.ok(!JSON.stringify(relayWorkspace(value, owner.uid)).includes('BOB_SECRET'));
  assert.ok(!JSON.stringify(relayWorkspace(value, peer.uid)).includes('ALICE_SECRET'));
  assert.equal(relayWorkspace(value, peer.uid).files.length, 3);
  assert.throws(() => relayWorkspace(value, 'outsider'), /Join/);
  assert.throws(() => action(value, owner, { action: 'save', taskId: 'even', code: 'stolen', revision: 0, userId: peer.uid }), /not available/);
  action(value, owner, { action: 'save', taskId: 'maximum', code: 'shared edit', revision: 0 });
  assert.equal(relayWorkspace(value, peer.uid).files.find(file => file.id === 'maximum').code, 'shared edit');
});

test('shared edits use revisions and submission freezes every task without publishing source', () => {
  const value = building();
  action(value, owner, { action: 'save', taskId: 'maximum', code: 'first edit', revision: 0 });
  assert.throws(() => action(value, peer, { action: 'save', taskId: 'maximum', code: 'stale edit', revision: 0 }), /changed/);
  assert.equal(value.relay.tasks[2].code, 'first edit');
  assert.throws(() => action(value, owner, { action: 'submit' }), /marked done/);
  for (const task of value.relay.tasks) {
    if (!task.validation) task.validation = { passed: true, score: 100, summary: 'fixture validation' };
    action(value, task.ownerId === peer.uid ? peer : owner, { action: 'done', taskId: task.id, revision: task.revision, done: true });
  }
  assert.throws(() => action(value, peer, { action: 'submit' }), /host/);
  action(value, owner, { action: 'submit' });
  assert.equal(value.readOnly, true); assert.deepEqual(value.files, []);
  assert.ok(relayWorkspace(value, owner.uid).files.every(file => file.readOnly));
  assert.throws(() => action(value, owner, { action: 'save', taskId: 'sum', code: 'late', revision: 0 }), /not accepting edits/);
});

test('only the host can end a Relay and ending immediately hides every workspace file', () => {
  const value = building('frontend');
  assert.throws(() => action(value, peer, { action: 'end' }), /Only the host/);
  assert.equal(action(value, owner, { action: 'end' }, 16000), true);
  assert.equal(value.relay.status, 'ENDED');
  assert.equal(value.readOnly, true);
  assert.deepEqual(relayWorkspace(value, owner.uid, 16000).files, []);
  assert.deepEqual(relayWorkspace(value, peer.uid, 16000).files, []);
  assert.throws(() => action(value, owner, { action: 'save', taskId: 'navigation', code: 'late', revision: 0 }, 16001), /not accepting edits/);
});

test('generic snapshots redact current and legacy Relay code, files, notes and history', () => {
  const value = building(); const service = new RoomService({});
  value.relay.tasks[0].code = 'PRIVATE_SOURCE'; value.files = [{ name: 'legacy.js', code: 'PRIVATE_SOURCE' }];
  value.history = [{ files: value.files }]; value.notes = { text: 'PRIVATE_SOURCE' };
  assert.ok(!JSON.stringify(service.snapshot(value)).includes('PRIVATE_SOURCE'));
  value.relay = { mode: 'frontend', submission: { files: value.files }, tasks: [] };
  assert.ok(!JSON.stringify(service.snapshot(value)).includes('PRIVATE_SOURCE'));
  assert.throws(() => relayWorkspace(value, owner.uid), /older shared/);
  value.relay = null;
  assert.ok(JSON.stringify(service.snapshot(value)).includes('PRIVATE_SOURCE'));
});

test('concurrent claims are serialized and failed persistence rolls back edits', async () => {
  const value = room(); selecting(value);
  let failSave = false;
  const controller = createRelayController({ roomRepository: { findById: () => value, save: async () => { if (failSave) throw new Error('storage failed'); } }, now: () => 101 });
  const responses = [response(), response()];
  await Promise.all([owner, peer].map((user, index) => controller.action(request(user, { action: 'claim', taskId: 'sum' }), responses[index])));
  assert.deepEqual(responses.map(res => res.statusCode).sort(), [200, 409]);
  failSave = true;
  const res = response(); await controller.action(request(owner, { action: 'claim', taskId: 'even' }), res);
  assert.equal(res.statusCode, 503); assert.equal(value.relay.tasks[1].ownerId, null);
});

test('team DSA runs isolate each function and never return raw stdout or source', async () => {
  const value = building(); value.relay.tasks.forEach((task, index) => { task.code = `PRIVATE_SOURCE_${index}`; });
  const sources = [];
  const controller = createRelayController({ roomRepository: { findById: () => value }, runner: { run: async ({ code }) => { sources.push(code); return { status: 'error', stdout: code, stderr: code }; } } });
  const res = response(); await controller.run(request(owner), res);
  assert.equal(res.statusCode, 200); assert.equal(sources.length, 3);
  assert.ok(sources.every(source => (source.match(/PRIVATE_SOURCE_/g) || []).length === 1));
  assert.ok(!JSON.stringify(res.body).includes('PRIVATE_SOURCE'));
  const forbidden = response(); await controller.run(request(owner, { taskId: 'even' }), forbidden);
  assert.equal(forbidden.statusCode, 403);
});

test('combined frontend preview contains only pixels and renders sections separately', async () => {
  const value = building('frontend'); let count = 0;
  const controller = createRelayController({ roomRepository: { findById: () => value }, render: async (html, width) => {
    assert.equal(width, 375); assert.ok(!html.includes('<iframe')); count++;
    const png = new PNG({ width, height: 10 }); png.data.fill(255); return PNG.sync.write(png).toString('base64');
  } });
  const res = response(); await controller.run(request(owner, { width: 375 }), res);
  assert.equal(res.statusCode, 200); assert.equal(count, 4);
  assert.deepEqual(Object.keys(res.body).sort(), ['image', 'message', 'width']);
  const png = PNG.sync.read(Buffer.from(res.body.image.split(',')[1], 'base64'));
  assert.equal(png.width, 375); assert.equal(png.height, 40);
});

test('authenticated HTTP Relay lifecycle protects invite, generic routes and saved assignments', async () => {
  const rooms = new Map();
  const repository = {
    listAll: () => [...rooms.values()], findByName: () => null,
    findById: id => rooms.get(id), fetchById: async id => rooms.get(id),
    findByInviteCode: code => [...rooms.values()].find(value => value.inviteCode === code),
    save: async value => { rooms.set(value.id, value); }
  };
  const app = createApp({ roomRepository: repository, roomService: new RoomService(repository) });
  const server = http.createServer(app); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function send(path, uid, body) {
    const headers = { 'Content-Type': 'application/json', ...(uid ? { Authorization: 'Bearer local-dev-user', 'X-Codefora-User-Id': uid, 'X-Codefora-User-Name': uid } : {}) };
    const res = await fetch(base + path, { headers, ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) });
    return { status: res.status, body: await res.json() };
  }
  try {
    assert.equal((await send('/rooms', null, { relayMode: 'dsa' })).status, 401);
    const created = await send('/rooms', owner.uid, { name: 'HTTP Relay', relayMode: 'dsa', max: 2, userId: peer.uid, files: [{ name: 'evil.js', code: 'CLIENT_TEMPLATE' }] });
    assert.equal(created.status, 201); assert.deepEqual(created.body.files, []);
    const value = rooms.get(created.body.id), endpoint = `/rooms/${value.id}/relay`;
    assert.equal(value.ownerUserId, owner.uid);
    assert.equal((await send(endpoint, null)).status, 401);
    assert.equal((await send(endpoint, peer.uid, { action: 'join', inviteCode: 'WRONG' })).status, 403);
    for (const user of [owner, peer]) {
      const joined = await send(endpoint, user.uid, { action: 'join', inviteCode: value.inviteCode });
      assert.equal(joined.status, 200);
      assert.equal(joined.body.joinedNow, true);
      await send(endpoint, user.uid, { action: 'ready', ready: true });
    }
    const duplicateJoin = await send(endpoint, peer.uid, { action: 'join', inviteCode: value.inviteCode });
    assert.equal(duplicateJoin.body.joinedNow, false);
    await send(endpoint, owner.uid, { action: 'start' });
    await send(endpoint, peer.uid, { action: 'claim', taskId: 'even' });
    value.relay.selectionEndsAt = Date.now() - 1;
    const workspace = await send(endpoint, owner.uid);
    assert.equal(workspace.body.relay.status, 'BUILDING');
    assert.equal(workspace.body.files.some(file => file.id === 'even'), false);
    assert.equal((await send(endpoint, peer.uid, { action: 'save', taskId: 'even', code: 'BOB_HTTP_SECRET', revision: 0 })).status, 200);
    assert.equal((await send(endpoint, owner.uid, { action: 'save', taskId: 'even', code: 'overwrite', revision: 1, userId: peer.uid })).status, 403);
    for (const path of [`/rooms/invite/${value.inviteCode}`, `/rooms/${value.id}?inviteCode=${value.inviteCode}`, '/rooms', endpoint]) {
      const payload = await send(path, owner.uid); assert.equal(payload.status, 200); assert.ok(!JSON.stringify(payload.body).includes('BOB_HTTP_SECRET'));
    }
    assert.equal((await send(`/rooms/${value.id}/project`, owner.uid, { files: [{ name: 'new.js', code: 'bypass' }] })).status, 409);
    rooms.set(value.id, JSON.parse(JSON.stringify(value)));
    const rejoined = await send(endpoint, peer.uid, { action: 'join' });
    assert.equal(rejoined.body.files.find(file => file.id === 'even').code, 'BOB_HTTP_SECRET');
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('live shared-editor transports reject Relay room IDs and invite aliases', async () => {
  const value = building();
  const normal = { ...value, id: 'CF-NORMAL', relay: null };
  const repository = {
    findById: id => id === value.id ? value : id === normal.id ? normal : null,
    fetchById: async id => repository.findById(id),
    findByInviteCode: code => code === value.inviteCode ? value : null,
    fetchByInviteCode: async code => repository.findByInviteCode(code),
    markActive: () => {}, listAll: () => [value], allPublicSummaries: () => []
  };
  const server = http.createServer(); const io = new Server(server);
  registerCollaborationSocket(io, { roomRepository: repository, roomService: new RoomService(repository) });
  const wss = new WebSocketServer({ noServer: true }); registerYjsUpgrade(server, wss, repository);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = `127.0.0.1:${server.address().port}`;
  const socket = client(`http://${address}`, { autoConnect: false, transports: ['websocket'], reconnection: false });
  const received = []; socket.on('room:state', snapshot => received.push(snapshot));
  try {
    const rejected = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('No Relay rejection received')), 5000);
      socket.on('room:join:failed', payload => { clearTimeout(timer); resolve(payload); });
    });
    socket.on('connect', () => socket.emit('room:join', { roomId: value.id, username: 'Alice', userId: owner.uid, inviteCode: value.inviteCode }));
    socket.connect();
    assert.equal((await rejected).reason, 'relay_workspace'); assert.deepEqual(received, []); assert.deepEqual(value.users, []);
    for (const roomId of [value.id, value.inviteCode, encodeURIComponent(value.id)]) {
      await new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://${address}/yjs/room-${roomId}-file-sum.js`);
        ws.once('open', () => { ws.close(); reject(new Error('Relay Yjs connection unexpectedly opened')); });
        ws.once('error', resolve);
      });
    }
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://${address}/yjs/room-${normal.id}-file-main.js`);
      ws.once('open', () => { ws.close(); resolve(); }); ws.once('error', reject);
    });
  } finally { socket.disconnect(); for (const ws of wss.clients) ws.terminate(); await new Promise(resolve => wss.close(resolve)); await new Promise(resolve => io.close(resolve)); }
});
