import { PNG } from 'pngjs';
import { randomUUID } from 'node:crypto';
import { withChallengeLock } from './challengeStore.js';
import { relayTasks, relayExpected, relayTestInputs } from '../data/relayTasks.js';

export const RELAY_SELECTION_MS = 15000;
export const RELAY_DISCONNECT_GRACE_MS = 30000;
const fail = (message, status = 409) => Object.assign(new Error(message), { status });

export function createRelay(mode) {
  const requestedMode = String(mode || '').trim().toLowerCase();
  if (!['frontend', 'dsa', 'backend'].includes(requestedMode)) return null;
  const normalized = requestedMode === 'frontend' ? 'frontend' : requestedMode === 'backend' ? 'backend' : 'dsa';
  return { version: 2, mode: normalized, status: 'LOBBY', selectionEndsAt: null, members: [], tasks: relayTasks(normalized), submittedAt: null, endedAt: null, result: null, activity: [], chat: [], notes: { text: '', draws: [] } };
}

export function relayPhase(relay, now = Date.now()) {
  if (relay?.status === 'SELECTING' && now >= relay.selectionEndsAt) return 'BUILDING';
  return relay?.status || 'LOBBY';
}

export function finishRelaySelection(room, now = Date.now()) {
  const relay = room.relay;
  if (relay?.status !== 'SELECTING' || now < relay.selectionEndsAt) return false;
  for (const member of relay.members) {
    if (relay.tasks.some(task => task.ownerId === member.userId)) continue;
    const task = relay.tasks.find(task => task.ownerId === null);
    if (task) { task.ownerId = member.userId; task.ownerName = member.name; }
  }
  relay.status = 'BUILDING';
  return true;
}

export function publicRelay(relay, now = Date.now()) {
  if (!relay) return null;
  return {
    version: relay.version || 1, mode: relay.mode, status: relayPhase(relay, now), selectionEndsAt: relay.selectionEndsAt || null,
    submittedAt: relay.submittedAt || null, endedAt: relay.endedAt || null,
    members: (relay.members || []).map(({ userId, name, ready, online, lastSeenAt, mic, speaking }) => ({ userId, name, ready, online: online !== false, lastSeenAt: lastSeenAt || null, mic: Boolean(mic), speaking: Boolean(speaking) })),
    tasks: (relay.tasks || []).map(({ id, title, description, fileName, language, signature, ownerId, ownerName, done, revision, validation }) => ({ id, title, description, fileName, language, signature, ownerId, ownerName, done: Boolean(done), revision: revision || 0, validation: validation ? { passed: Boolean(validation.passed), score: Number(validation.score) || 0, checkedAt: validation.checkedAt || null, summary: validation.summary || '' } : null })),
    result: relay.result ? { ...relay.result, tasks: Array.isArray(relay.result.tasks) ? relay.result.tasks.map(item => ({ ...item })) : [] } : null,
    activity: Array.isArray(relay.activity) ? relay.activity.slice(-60) : [],
    chat: Array.isArray(relay.chat) ? relay.chat.slice(-100).map(message => ({
      id: message.id,
      userId: message.userId,
      name: message.name,
      text: message.text,
      createdAt: message.createdAt
    })) : [],
    notes: { text: String(relay.notes?.text || ''), draws: Array.isArray(relay.notes?.draws) ? relay.notes.draws.slice(-500) : [] }
  };
}

export function canAccessRelayTask(relay, task, userId, now = Date.now()) {
  if (!relay?.members?.some(member => member.userId === userId)) return false;
  const phase = relayPhase(relay, now);
  if (!['BUILDING', 'SUBMITTED'].includes(phase)) return false;
  return task.ownerId === userId || task.ownerId === null;
}

export function relayWorkspace(room, userId, now = Date.now()) {
  const relay = room.relay;
  if (relay?.version !== 2) throw fail('This is an older shared Relay room. Create a new Relay to use private assignments.');
  if (!relay.members.some(member => member.userId === userId)) throw fail('Join this relay first.', 403);
  return {
    id: room.id, name: room.name, ownerUserId: room.ownerUserId, max: room.max, inviteCode: room.inviteCode, serverNow: now,
    relay: publicRelay(relay, now),
    // Do not send hidden source and rely on the browser to filter it.
    files: relay.tasks.filter(task => canAccessRelayTask(relay, task, userId, now)).map(task => ({ ...task, readOnly: relayPhase(relay, now) !== 'BUILDING', validation: task.validation ? { passed: Boolean(task.validation.passed), score: Number(task.validation.score) || 0, checkedAt: task.validation.checkedAt || null, summary: task.validation.summary || '' } : null }))
  };
}

function relayActivity(relay, text, now) {
  relay.activity = [...(Array.isArray(relay.activity) ? relay.activity : []), { id: `${now}-${Math.random().toString(36).slice(2, 8)}`, text, createdAt: now }].slice(-60);
}

export function removeRelayMember(room, userId, now = Date.now()) {
  const relay = room?.relay;
  if (!relay || relayPhase(relay, now) === 'ENDED') throw fail('This Relay has ended.');
  const index = relay.members.findIndex(member => member.userId === userId);
  if (index < 0) return false;
  const [removed] = relay.members.splice(index, 1);
  relay.tasks.forEach(task => { if (task.ownerId === userId) { task.ownerId = null; task.ownerName = null; task.done = false; task.validation = null; } });
  // A roster change invalidates the previous ready check. Every remaining
  // teammate must explicitly confirm the new roster before selection starts.
  relay.members.forEach(member => { member.ready = false; });
  if (room.ownerUserId === userId) {
    const successor = relay.members.find(member => member.online !== false) || relay.members[0];
    if (successor) room.ownerUserId = successor.userId;
    else { relay.status = 'ENDED'; relay.endedAt = now; room.readOnly = true; }
  }
  relayActivity(relay, `${removed.name} left the Relay${room.ownerUserId === removed.userId ? '' : ''}`, now);
  return true;
}

export function markRelayPresence(room, userId, online, now = Date.now()) {
  const member = room?.relay?.members?.find(item => item.userId === userId);
  if (!member) return false;
  member.online = Boolean(online);
  member.lastSeenAt = online ? null : now;
  if (!online) member.ready = false;
  return true;
}

function ensureRelayHost(room, uid) {
  if (uid !== room.ownerUserId) throw fail('Only the host can manage Relay members.', 403);
}

export async function validateRelayTask({ relay, task, runner, render, renderedImage, width = 800 }) {
  if (!task) return { passed: false, score: 0, summary: 'Task not found.' };
  if (relay.mode === 'dsa') {
    const source = `const solve = function ${task.title}(values) {\n${task.code}\n};\nconst inputs = JSON.parse(require('fs').readFileSync(0, 'utf8'));\nconsole.log(JSON.stringify(inputs.map(values => solve(values))));`;
    const execution = await runner.run({ language: 'javascript', code: source, input: JSON.stringify(relayTestInputs), timeLimitMs: 2000 });
    let values = [];
    try { values = JSON.parse(execution.stdout || '[]'); } catch { values = []; }
    const passed = execution.status === 'success' && Array.isArray(values) ? relayTestInputs.filter((input, index) => values[index] === relayExpected[task.id]?.(input)).length : 0;
    return { passed: passed === relayTestInputs.length, score: Math.round(100 * passed / relayTestInputs.length), summary: `${passed}/${relayTestInputs.length} function tests passed.`, checkedAt: Date.now() };
  }
  const source = String(task.code || '').trim();
  const requirements = relay.mode === 'backend'
    ? { auth: /auth|login|token|session/i, validation: /valid|error|try|catch/i, response: /res\.|return\s+\{/i }
    : { structure: /<(section|main|div|nav|footer|header)\b/i, content: /<(h1|h2|p|button|a)\b/i, style: /<style\b|style\s*=/i };
  const checks = Object.entries(requirements).map(([name, pattern]) => ({ name, passed: pattern.test(source) }));
  let rendered = renderedImage === undefined ? true : Boolean(renderedImage && renderedImage.length > 50);
  if (render && renderedImage === undefined) {
    try { const image = await render(source, width); rendered = Boolean(image && image.length > 50); } catch { rendered = false; }
  }
  const passed = rendered && checks.every(check => check.passed);
  return { passed, score: Math.round(100 * (checks.filter(check => check.passed).length / checks.length) * (rendered ? 1 : 0.5)), summary: `${checks.filter(check => check.passed).length}/${checks.length} structure checks passed${rendered ? '.' : '; preview failed.'}`, checks, checkedAt: Date.now() };
}

export function updateRelay(room, user, body, now = Date.now()) {
  const relay = room.relay;
  if (relay?.version !== 2) throw fail('Create a new Relay to use private assignments.');
  const uid = user.uid;
  const member = relay.members.find(item => item.userId === uid);
  const phase = relayPhase(relay, now);
  if (body.action === 'join') {
    if (member) return false;
    const invite = String(body.inviteCode || '').trim().toUpperCase();
    if (uid !== room.ownerUserId && (!invite || invite !== room.inviteCode)) throw fail('A valid Relay invite code is required.', 403);
    if (phase !== 'LOBBY') throw fail('Selection has started. Only existing teammates can rejoin.');
    if (relay.members.length >= room.max) throw fail('This relay is full.');
    relay.members.push({ userId: uid, name: String(user.name || 'Developer').slice(0, 60), ready: false, online: false, lastSeenAt: null });
    relayActivity(relay, `${String(user.name || 'Developer').slice(0, 60)} joined the Relay`, now);
    return true;
  }
  if (!member) throw fail('Join this relay first.', 403);
  if (body.action === 'leave') {
    if (phase === 'SUBMITTED') throw fail('This Relay is already submitted.');
    return removeRelayMember(room, uid, now);
  }
  if (body.action === 'remove') {
    ensureRelayHost(room, uid);
    const targetId = String(body.targetUserId || '').trim();
    if (!targetId || targetId === uid) throw fail('Choose a teammate to remove.', 400);
    if (!removeRelayMember(room, targetId, now)) throw fail('That teammate is no longer in the Relay.', 404);
    return true;
  }
  if (body.action === 'transfer_host') {
    ensureRelayHost(room, uid);
    const targetId = String(body.targetUserId || '').trim();
    if (!targetId || targetId === uid) throw fail('Choose a different teammate to receive host controls.', 400);
    const target = relay.members.find(item => item.userId === targetId);
    if (!target) throw fail('Choose a teammate to receive host controls.', 404);
    if (target.online === false) throw fail('The new host must be online.', 409);
    room.ownerUserId = target.userId;
    relayActivity(relay, `${target.name} is now the Relay host`, now);
    return true;
  }
  if (body.action === 'regenerate_invite') {
    ensureRelayHost(room, uid);
    room.inviteCode = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
    relayActivity(relay, 'The host regenerated the invite code', now);
    return true;
  }
  if (body.action === 'end') {
    if (uid !== room.ownerUserId) throw fail('Only the host can end this Relay.', 403);
    if (phase === 'ENDED') return false;
    relay.status = 'ENDED'; relay.endedAt = now; room.readOnly = true;
    return true;
  }
  if (body.action === 'ready') {
    if (phase !== 'LOBBY') throw fail('Ready status is locked after selection starts.');
    member.ready = body.ready === true;
    return;
  }
  if (body.action === 'start') {
    if (uid !== room.ownerUserId) throw fail('Only the host can start selection.', 403);
    if (phase !== 'LOBBY') throw fail('The selection window cannot be restarted.');
    if (relay.members.length !== room.max || relay.members.some(item => !item.ready)) throw fail('Wait for the full team to join and mark ready.');
    relay.status = 'SELECTING'; relay.selectionEndsAt = now + RELAY_SELECTION_MS;
    return;
  }
  if (body.action === 'claim') {
    if (phase !== 'SELECTING') throw fail('Tasks can only be selected during the first 15 seconds.');
    const task = relay.tasks.find(item => item.id === body.taskId);
    if (!task) throw fail('Task not found.', 404);
    if (task.ownerId && task.ownerId !== uid) throw fail('A teammate has already selected this task.');
    const previous = relay.tasks.find(item => item.ownerId === uid);
    if (previous) { previous.ownerId = null; previous.ownerName = null; }
    task.ownerId = uid; task.ownerName = member.name;
    return;
  }
  if (phase !== 'BUILDING') throw fail('This relay is not accepting edits.');
  if (body.action === 'submit') {
    if (uid !== room.ownerUserId) throw fail('Only the host can submit the team work.', 403);
    if (relay.tasks.some(task => !task.done || !task.validation?.passed)) throw fail('Every task must pass validation and be marked done before submission.');
    relay.status = 'SUBMITTED'; relay.submittedAt = now; room.readOnly = true;
    relay.result = { score: Math.round(relay.tasks.reduce((sum, task) => sum + (Number(task.validation?.score) || 0), 0) / Math.max(1, relay.tasks.length)), passed: relay.tasks.filter(task => task.validation?.passed).length, total: relay.tasks.length, submittedAt: now, submittedBy: uid, tasks: relay.tasks.map(task => ({ taskId: task.id, title: task.title, score: Number(task.validation?.score) || 0, passed: Boolean(task.validation?.passed), summary: task.validation?.summary || '' })) };
    relayActivity(relay, `${member.name} submitted the completed Relay`, now);
    // Task sources remain frozen in the private Relay store, never copied to public room.files.
    return;
  }
  const task = relay.tasks.find(item => item.id === body.taskId);
  if (!task || !canAccessRelayTask(relay, task, uid, now)) throw fail('This task is not available to you.', 403);
  if (body.action === 'save') {
    if (typeof body.code !== 'string' || Buffer.byteLength(body.code, 'utf8') > 60000) throw fail('Keep each task below 60 KB.', 400);
    if (body.revision !== task.revision) throw fail('This task changed in another tab or by a teammate. Reload the latest version before saving.');
    task.code = body.code; task.revision++; task.done = false; task.validation = null;
    relayActivity(relay, `${member.name} saved ${task.title}`, now);
  } else if (body.action === 'done') {
    if (body.revision !== task.revision) throw fail('Save or reload the latest task before marking it done.');
    if (body.done === true && !task.validation?.passed) throw fail('Run this task and pass validation before marking it done.');
    task.done = body.done === true;
    relayActivity(relay, `${member.name} ${task.done ? 'completed' : 'reopened'} ${task.title}`, now);
  } else throw fail('Unknown Relay action.', 400);
}

export function createRelayController({ roomRepository, roomService, runner, render, profileController = null, publish = () => {}, now = () => Date.now() }) {
  const running = new Set();
  async function findRoom(id) {
    const room = roomRepository.fetchById ? await roomRepository.fetchById(id) : roomRepository.findById(id);
    if (!room?.relay) throw fail('Relay not found.', 404);
    return room;
  }
  async function access(req) {
    return withChallengeLock(`relay:${req.params.id}`, async () => {
      const room = await findRoom(req.params.id);
      relayWorkspace(room, req.firebaseUser.uid, now());
      const staged = { ...room, relay: structuredClone(room.relay) };
      if (finishRelaySelection(staged, now())) {
        const previous = room.relay; room.relay = staged.relay;
        try { await roomRepository.save(room); } catch (error) { room.relay = previous; throw error; }
      }
      return room;
    });
  }
  const respondError = (res, error) => res.status(error.status || 503).json({ error: error.status ? error.message : 'Relay is temporarily unavailable. Your existing work is unchanged.' });
  return {
    workspace: async (req, res) => {
      try { const room = await access(req); res.json(relayWorkspace(room, req.firebaseUser.uid, now())); }
      catch (error) { respondError(res, error); }
    },
    action: async (req, res) => {
      try {
        await withChallengeLock(`relay:${req.params.id}`, async () => {
          const room = await findRoom(req.params.id);
          const staged = { ...room, relay: structuredClone(room.relay) };
          finishRelaySelection(staged, now());
          let validation;
          if (req.body?.action === 'done' && req.body?.done === true) {
            const task = staged.relay.tasks.find(item => item.id === req.body.taskId);
            if (!task || !canAccessRelayTask(staged.relay, task, req.firebaseUser.uid, now())) throw fail('This task is not available to you.', 403);
            validation = await validateRelayTask({ relay: staged.relay, task, runner, render, width: 800 });
            if (!validation.passed) throw fail(`Validation failed: ${validation.summary}`);
            task.validation = validation;
          }
          const actionResult = updateRelay(staged, req.firebaseUser, req.body || {}, now());
          const previous = { relay: room.relay, readOnly: room.readOnly, ownerUserId: room.ownerUserId };
          room.relay = staged.relay; room.readOnly = Boolean(staged.readOnly); room.ownerUserId = staged.ownerUserId;
          try { await roomRepository.save(room); }
          catch (error) { Object.assign(room, previous); throw error; }
          if (roomService) publish(roomService.snapshot(room));
          if (req.body?.action === 'submit' && profileController?.recordCompetitiveResult) {
            const mode = room.relay.mode === 'frontend' ? 'frontend' : room.relay.mode === 'backend' ? 'backend' : 'relay';
            await Promise.all((room.relay.members || []).map((member) => profileController.recordCompetitiveResult(member.userId, {
              mode,
              matchId: `relay:${room.id}`,
              won: true
            })));
          }
          if (req.body?.action === 'leave') {
            res.json({ left: true, id: room.id, relay: publicRelay(room.relay, now()), ownerUserId: room.ownerUserId });
            return;
          }
          const workspace = relayWorkspace(room, req.firebaseUser.uid, now());
          if (req.body?.action === 'join') workspace.joinedNow = actionResult === true;
          res.json(workspace);
        });
      } catch (error) { respondError(res, error); }
    },
    run: async (req, res) => {
      let key;
      try {
        const room = await access(req);
        if (!['BUILDING', 'SUBMITTED'].includes(relayPhase(room.relay, now()))) throw fail('Build starts after the selection window ends.');
        key = `${room.id}:${req.firebaseUser.uid}`;
        if (running.has(key)) { key = null; throw fail('Your previous run is still in progress.'); }
        running.add(key);
        const relay = structuredClone(room.relay);
        const taskId = req.body?.taskId;
        const tasks = taskId ? relay.tasks.filter(task => task.id === taskId && canAccessRelayTask(relay, task, req.firebaseUser.uid, now())) : relay.tasks.filter(task => canAccessRelayTask(relay, task, req.firebaseUser.uid, now()));
        if (!tasks.length) throw fail('This task is not available to you.', 403);
        const validations = [];
        if (relay.mode === 'frontend') {
          // Each section is rendered separately, so neither styles nor markup can escape into another task.
          const width = req.body?.width === 375 ? 375 : 800;
          const sections = [];
          for (const task of tasks) {
            const renderedImage = await render(task.code, width);
            sections.push(PNG.sync.read(Buffer.from(renderedImage, 'base64')));
            validations.push({ task, validation: await validateRelayTask({ relay, task, runner, renderedImage, width }) });
          }
          const combined = new PNG({ width, height: sections.reduce((height, section) => height + section.height, 0) });
          let top = 0;
          for (const section of sections) {
            PNG.bitblt(section, combined, 0, 0, Math.min(width, section.width), section.height, 0, top);
            top += section.height;
          }
          if (relayPhase(room.relay, now()) === 'BUILDING') {
            validations.forEach(({ task, validation }) => { const stored = room.relay.tasks.find(item => item.id === task.id); if (stored && stored.revision === task.revision) stored.validation = validation; });
            if (roomRepository.save) await roomRepository.save(room); if (roomService) publish(roomService.snapshot(room));
          }
          const response = { image: `data:image/png;base64,${PNG.sync.write(combined).toString('base64')}`, width, message: taskId ? 'Your section preview' : 'Combined team page. Source remains private.' };
          if (taskId) response.validation = validations[0]?.validation || null;
          return res.json(response);
        }

        const results = [];
        for (const task of tasks) {
          const validation = await validateRelayTask({ relay, task, runner, render, width: 800 });
          validations.push({ task, validation });
          results.push({ taskId: task.id, title: task.title, passed: validation.passed ? validation.summary.match(/^(\d+)\//)?.[1] || relayTestInputs.length : 0, total: relay.mode === 'dsa' ? relayTestInputs.length : 3, status: validation.passed ? 'Passed' : 'Tests failed', score: validation.score, summary: validation.summary });
        }
        if (relayPhase(room.relay, now()) === 'BUILDING') {
          validations.forEach(({ task, validation }) => { const stored = room.relay.tasks.find(item => item.id === task.id); if (stored && stored.revision === task.revision) stored.validation = validation; });
          if (roomRepository.save) await roomRepository.save(room); if (roomService) publish(roomService.snapshot(room));
        }
        res.json({ results, message: 'Function outputs are checked together against the team data-summary contract. Teammate source and execution output remain private.' });
      } catch (error) { respondError(res, error); }
      finally { if (key) running.delete(key); }
    }
  };
}
