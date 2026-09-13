import { cryptoId } from "../utils/id.js";
import { activateWarBattle, finishWarBattle } from '../services/warBattleService.js';
import { verifySocketIdentity } from '../middleware/firebaseAuth.js';
import { globalOnlineUsers, userIdToRoomId } from "../utils/presenceTracker.js";
import { canAccessRelayTask, markRelayPresence, removeRelayMember, relayPhase, RELAY_DISCONNECT_GRACE_MS } from '../services/relayService.js';

const MEMBER_COLORS = ["#00E5FF", "#FF9100", "#FF007F", "#B400FF", "#00FF00", "#FFEA00", "#FF0000", "#00FFCC"];
let warRealtimeIO = null;
export function publishWarSnapshot(snapshot) {
  warRealtimeIO?.to(snapshot.id).emit('war:state', snapshot.warArena);
}
export function publishRoomSnapshot(snapshot) { warRealtimeIO?.to(snapshot.id).emit('room:state', snapshot); }
export function publishRelaySnapshot(snapshot) { if (snapshot?.relay) warRealtimeIO?.to(snapshot.id).emit('relay:state', { roomId: snapshot.id, status: snapshot.relay.status, ownerUserId: snapshot.ownerUserId, serverNow: Date.now(), relay: snapshot.relay }); }
const assignUserColor = (role, existingUsers = []) => {
  if (role === "Viewer") return "#4B5563"; // Neutral gray for viewers
  if (role === "Host") return "#FF7A18";
  
  // Find a color that isn't currently used by any member or host in the room
  const usedColors = new Set(existingUsers.map(u => u.color));
  const availableColors = MEMBER_COLORS.filter(color => !usedColors.has(color));
  
  // If all colors are used, fallback to random from the full palette
  if (availableColors.length === 0) {
    return MEMBER_COLORS[Math.floor(Math.random() * MEMBER_COLORS.length)];
  }
  
  // Return a random color from the available (unused) ones
  return availableColors[Math.floor(Math.random() * availableColors.length)];
};

export function registerCollaborationSocket(io, { roomRepository, roomService, profileController }) {
  warRealtimeIO = io;
  const socketUsers = new Map();
  const relaySockets = new Map();
  const relayCleanupTimers = new Map();
  const voiceMembers = new Map();
  const emitVoiceRoster = (roomId, team) => {
    const peers = [...voiceMembers.entries()].filter(([, member]) => member.roomId === roomId && member.team === team).map(([id, member]) => ({ id, name: member.name }));
    for (const peer of peers) io.to(peer.id).emit('war:voice:peers', { roomId, team, peers });
  };
  const pendingRoomSaves = new Map();
  const broadcastRooms = () => io.emit("rooms:update", roomRepository.allPublicSummaries((room) => roomService.publicRoom(room)));
  const saveRoomSoon = (room) => {
    if (pendingRoomSaves.has(room.id)) return;
    const timer = setTimeout(() => {
      pendingRoomSaves.delete(room.id);
      roomRepository.save(room).catch((error) => console.warn(`Room persistence failed: ${error.message}`));
    }, 1000);
    pendingRoomSaves.set(room.id, timer);
  };
  const emitWarState = (room) => {
    if (!room?.warArena) return;
    io.to(room.id).emit("war:state", roomService.snapshot(room).warArena);
    io.emit("rooms:update", roomRepository.allPublicSummaries((existing) => roomService.publicRoom(existing)));
  };
  const recordWarStats = (room) => {
    const arena = room?.warArena;
    if (!arena || arena.status !== "COMPLETED" || arena.statsRecordedAt || !profileController?.recordCompetitiveResult) return;
    arena.statsRecordedAt = Date.now();
    const mode = arena.battleType === "mcqs" ? "blind" : "battles";
    Promise.all((arena.participants || []).map((participant) => profileController.recordCompetitiveResult(participant.userId, {
      mode,
      matchId: `battle:${room.id}`,
      won: Boolean(arena.winningTeam && participant.team === arena.winningTeam)
    }))).catch((error) => console.warn(`Competitive stats persistence failed: ${error.message}`));
  };
  const saveAndEmitWarState = (room) => {
    recordWarStats(room);
    roomRepository.save(room).catch((error) => console.warn(`War arena persistence failed: ${error.message}`));
    emitWarState(room);
  };
  const activateAndEmitWar = (room) => {
    if (!activateWarBattle(room?.warArena)) return;
    addWarActivity(room, 'Battle started');
    saveAndEmitWarState(room);
    io.to(room.id).emit('battle:started', { roomId: room.id, serverNow: Date.now(), startsAt: room.warArena.startsAt, endsAt: room.warArena.endsAt });
  };
  const expiryTimer = setInterval(() => {
    for (const room of roomRepository.listAll()) {
      activateAndEmitWar(room);
      if (finishWarBattle(room.warArena)) saveAndEmitWarState(room);
    }
  }, 1000);
  expiryTimer.unref?.();
  io.engine.on('close', () => clearInterval(expiryTimer));

  io.on("connection", (socket) => {
    const detachRelay = async ({ persist = true } = {}) => {
      const membership = relaySockets.get(socket.id);
      if (!membership) return;
      relaySockets.delete(socket.id);
      socket.leave(membership.roomId);
      const room = roomRepository.findById(membership.roomId);
      if (!room?.relay) return;
      const changed = markRelayPresence(room, membership.userId, false, Date.now());
      if (changed && persist) {
        await roomRepository.save(room).catch(() => {});
        publishRelaySnapshot(roomService.snapshot(room));
      }
      const lastSeenAt = room.relay.members.find(member => member.userId === membership.userId)?.lastSeenAt;
      if (lastSeenAt) {
        clearTimeout(relayCleanupTimers.get(`${room.id}:${membership.userId}`));
        const timer = setTimeout(async () => {
          relayCleanupTimers.delete(`${room.id}:${membership.userId}`);
          const current = roomRepository.findById(room.id);
          const member = current?.relay?.members?.find(item => item.userId === membership.userId);
          if (!member || member.online || member.lastSeenAt !== lastSeenAt) return;
          try { if (removeRelayMember(current, membership.userId, Date.now())) { await roomRepository.save(current); publishRelaySnapshot(roomService.snapshot(current)); } } catch { /* stale cleanup is best effort */ }
        }, RELAY_DISCONNECT_GRACE_MS);
        timer.unref?.();
        relayCleanupTimers.set(`${room.id}:${membership.userId}`, timer);
      }
    };
    socket.on('relay:join', async ({ roomId, userId } = {}, ack) => {
      try {
        const identity = await verifySocketIdentity(socket.handshake.auth?.token, userId);
        const room = roomRepository.findById(String(roomId || '').trim());
        if (!identity.uid || !room?.relay || !room.relay.members.some(member => member.userId === identity.uid)) throw new Error('Join the Relay through its invite first.');
        await detachRelay({ persist: false });
        socket.join(room.id);
        relaySockets.set(socket.id, { roomId: room.id, userId: identity.uid });
        clearTimeout(relayCleanupTimers.get(`${room.id}:${identity.uid}`));
        markRelayPresence(room, identity.uid, true, Date.now());
        await roomRepository.save(room);
        publishRelaySnapshot(roomService.snapshot(room));
        ack?.({ ok: true });
      } catch (error) { ack?.({ error: error.message || 'Could not connect to Relay presence.' }); }
    });
    socket.on('relay:heartbeat', ({ roomId, userId } = {}, ack) => {
      const membership = relaySockets.get(socket.id);
      if (!membership || membership.roomId !== String(roomId || '').trim() || membership.userId !== String(userId || '').trim()) return ack?.({ error: 'Relay presence is not connected.' });
      const room = roomRepository.findById(membership.roomId);
      if (!room?.relay || !markRelayPresence(room, membership.userId, true, Date.now())) return ack?.({ error: 'Relay is no longer available.' });
      ack?.({ ok: true, serverNow: Date.now() });
    });
    socket.on('relay:mic:update', async ({ roomId, userId, mic, speaking } = {}, ack) => {
      const membership = relaySockets.get(socket.id);
      const cleanRoomId = String(roomId || '').trim();
      const cleanUserId = String(userId || '').trim();
      const room = membership && membership.roomId === cleanRoomId && membership.userId === cleanUserId
        ? roomRepository.findById(cleanRoomId)
        : null;
      const member = room?.relay?.members?.find(item => item.userId === cleanUserId);
      if (!membership || !room?.relay || !member) {
        ack?.({ error: 'Relay voice presence is not connected.' });
        return;
      }
      member.mic = Boolean(mic);
      member.speaking = member.mic && Boolean(speaking);
      await roomRepository.save(room).catch(() => {});
      publishRelaySnapshot(roomService.snapshot(room));
      ack?.({ ok: true });
    });
    socket.on('relay:voice:signal', ({ roomId, userId, targetUserId, type, sdp, candidate } = {}, ack) => {
      const membership = relaySockets.get(socket.id);
      const cleanRoomId = String(roomId || '').trim();
      const cleanUserId = String(userId || '').trim();
      const target = String(targetUserId || '').trim();
      const room = membership && membership.roomId === cleanRoomId && membership.userId === cleanUserId ? roomRepository.findById(cleanRoomId) : null;
      if (!membership || !room?.relay || !room.relay.members.some(member => member.userId === cleanUserId)) { ack?.({ error: 'Relay voice is not connected.' }); return; }
      const allowed = new Set(['offer', 'answer', 'candidate', 'leave']);
      if (!allowed.has(type)) { ack?.({ error: 'Unsupported voice signal.' }); return; }
      const payload = { roomId: cleanRoomId, userId: cleanUserId, type, sdp: sdp || null, candidate: candidate || null };
      for (const [socketId, peer] of relaySockets.entries()) {
        if (socketId === socket.id || peer.roomId !== cleanRoomId || (target && peer.userId !== target)) continue;
        warRealtimeIO?.to(socketId).emit('relay:voice:signal', { ...payload, targetUserId: peer.userId });
      }
      ack?.({ ok: true });
    });
    socket.on('relay:chat:send', async ({ roomId, userId, text } = {}, ack) => {
      const membership = relaySockets.get(socket.id);
      const cleanRoomId = String(roomId || '').trim();
      const cleanUserId = String(userId || '').trim();
      const messageText = String(text || '').trim();
      const room = membership && membership.roomId === cleanRoomId && membership.userId === cleanUserId
        ? roomRepository.findById(cleanRoomId)
        : null;
      const member = room?.relay?.members?.find(item => item.userId === cleanUserId);
      if (!membership || !room?.relay || !member) { ack?.({ error: 'Relay chat is not connected.' }); return; }
      if (!messageText) { ack?.({ error: 'Message cannot be empty.' }); return; }
      if (messageText.length > 500) { ack?.({ error: 'Keep messages below 500 characters.' }); return; }
      const message = { id: cryptoId(), userId: cleanUserId, name: member.name || 'Teammate', text: messageText, createdAt: Date.now() };
      room.relay.chat = [...(Array.isArray(room.relay.chat) ? room.relay.chat : []), message].slice(-100);
      await roomRepository.save(room).catch(() => {});
      publishRelaySnapshot(roomService.snapshot(room));
      ack?.({ ok: true, message });
    });
    socket.on('relay:notes:update', async ({ roomId, userId, text } = {}, ack) => {
      const membership = relaySockets.get(socket.id);
      const cleanRoomId = String(roomId || '').trim();
      const cleanUserId = String(userId || '').trim();
      const room = membership && membership.roomId === cleanRoomId && membership.userId === cleanUserId ? roomRepository.findById(cleanRoomId) : null;
      if (!membership || !room?.relay?.members?.some(item => item.userId === cleanUserId)) { ack?.({ error: 'Relay notes are not connected.' }); return; }
      room.relay.notes = { ...(room.relay.notes || { draws: [] }), text: String(text || '').slice(0, 20000) };
      await roomRepository.save(room).catch(() => {});
      publishRelaySnapshot(roomService.snapshot(room));
      ack?.({ ok: true });
    });
    socket.on('relay:notes:draw', async ({ roomId, userId, draw } = {}, ack) => {
      const membership = relaySockets.get(socket.id);
      const cleanRoomId = String(roomId || '').trim();
      const cleanUserId = String(userId || '').trim();
      const room = membership && membership.roomId === cleanRoomId && membership.userId === cleanUserId ? roomRepository.findById(cleanRoomId) : null;
      if (!membership || !room?.relay?.members?.some(item => item.userId === cleanUserId)) { ack?.({ error: 'Relay notes are not connected.' }); return; }
      if (draw === 'clear') room.relay.notes = { ...(room.relay.notes || {}), draws: [] };
      else if (draw?.points?.length) room.relay.notes = { ...(room.relay.notes || {}), draws: [...(room.relay.notes?.draws || []), draw].slice(-500) };
      await roomRepository.save(room).catch(() => {});
      publishRelaySnapshot(roomService.snapshot(room));
      ack?.({ ok: true });
    });
    socket.on('relay:code:update', ({ roomId, taskId, code } = {}, ack) => {
      const membership = relaySockets.get(socket.id);
      const cleanRoomId = String(roomId || '').trim();
      const cleanTaskId = String(taskId || '').trim();
      const room = membership && membership.roomId === cleanRoomId ? roomRepository.findById(cleanRoomId) : null;
      const relay = room?.relay;
      const task = relay?.tasks?.find(item => item.id === cleanTaskId);
      if (!membership || !room || !relay || !task || relayPhase(relay) !== 'BUILDING' || !canAccessRelayTask(relay, task, membership.userId)) {
        ack?.({ error: 'This Relay task is not available for live editing.' });
        return;
      }
      const nextCode = String(code ?? '');
      if (Buffer.byteLength(nextCode, 'utf8') > 60000) {
        ack?.({ error: 'Keep each task below 60 KB.' });
        return;
      }
      for (const [socketId, target] of relaySockets.entries()) {
        if (socketId === socket.id || target.roomId !== cleanRoomId) continue;
        const targetTask = relay.tasks.find(item => item.id === cleanTaskId);
        if (targetTask && canAccessRelayTask(relay, targetTask, target.userId)) {
          io.to(socketId).emit('relay:code:update', { roomId: cleanRoomId, taskId: cleanTaskId, code: nextCode, senderId: membership.userId });
        }
      }
      ack?.({ ok: true });
    });
    socket.on('relay:cursor:update', ({ roomId, userId, taskId, position, selection } = {}, ack) => {
      const membership = relaySockets.get(socket.id);
      const cleanRoomId = String(roomId || '').trim();
      const cleanUserId = String(userId || '').trim();
      const room = membership && membership.roomId === cleanRoomId && membership.userId === cleanUserId ? roomRepository.findById(cleanRoomId) : null;
      const task = room?.relay?.tasks?.find(item => item.id === String(taskId || '').trim());
      if (!membership || !room?.relay || !task || !canAccessRelayTask(room.relay, task, cleanUserId)) { ack?.({ error: 'Relay cursor is not connected.' }); return; }
      const safePosition = { lineNumber: Math.max(1, Math.min(10000, Number(position?.lineNumber) || 1)), column: Math.max(1, Math.min(10000, Number(position?.column) || 1)) };
      const safeSelection = selection ? { startLineNumber: Math.max(1, Number(selection.startLineNumber) || safePosition.lineNumber), startColumn: Math.max(1, Number(selection.startColumn) || safePosition.column), endLineNumber: Math.max(1, Number(selection.endLineNumber) || safePosition.lineNumber), endColumn: Math.max(1, Number(selection.endColumn) || safePosition.column) } : null;
      const colorIndex = [...cleanUserId].reduce((sum, character) => sum + character.charCodeAt(0), 0) % MEMBER_COLORS.length;
      for (const [socketId, peer] of relaySockets.entries()) {
        if (socketId === socket.id || peer.roomId !== cleanRoomId) continue;
        warRealtimeIO?.to(socketId).emit('relay:cursor:update', { roomId: cleanRoomId, taskId: task.id, userId: cleanUserId, name: room.relay.members.find(item => item.userId === cleanUserId)?.name || 'Teammate', color: MEMBER_COLORS[colorIndex], position: safePosition, selection: safeSelection });
      }
      ack?.({ ok: true });
    });
    socket.on('relay:detach', () => { detachRelay().catch(() => {}); });
    const leaveVoice = () => {
      const previous = voiceMembers.get(socket.id);
      voiceMembers.delete(socket.id);
      if (previous) emitVoiceRoster(previous.roomId, previous.team);
    };
    socket.on('war:voice:join', ({ roomId } = {}, ack) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      const player = room?.warArena && user && getWarParticipant(room, user);
      if (!player || !['LOOP', 'SIDER'].includes(player.team) || room.warArena.voiceChatEnabled === false || room.warArena.status !== 'ACTIVE') {
        ack?.({ error: 'Team voice is unavailable. Join an active team battle first.' });
        return;
      }
      const teammates = (room.warArena.participants || []).filter(item => item.team === player.team && item.isOnline !== false);
      if (teammates.length < 2) {
        ack?.({ error: `Team ${player.team} needs at least two teammates for voice chat.` });
        return;
      }
      leaveVoice();
      voiceMembers.set(socket.id, { roomId, team: player.team, name: player.name });
      ack?.({ ok: true });
      emitVoiceRoster(roomId, player.team);
    });
    socket.on('war:voice:leave', leaveVoice);
    socket.on('war:voice:signal', ({ target, signal } = {}) => {
      const sender = voiceMembers.get(socket.id), receiver = voiceMembers.get(target);
      if (!sender || !receiver || sender.roomId !== receiver.roomId || sender.team !== receiver.team) return;
      const room = roomRepository.findById(sender.roomId);
      if (room?.warArena?.status !== 'ACTIVE' || room.warArena.voiceChatEnabled === false) return;
      const sourceUser = roomService.findUser(room, socket.id), targetUser = roomService.findUser(room, target);
      if (!sourceUser || !targetUser || getWarParticipant(room, sourceUser)?.team !== sender.team || getWarParticipant(room, targetUser)?.team !== sender.team) return;
      if (!signal || JSON.stringify(signal).length > 20000) return;
      io.to(target).emit('war:voice:signal', { from: socket.id, team: sender.team, signal });
    });
    socket.on('disconnect', leaveVoice);
    socket.on('war:leave', async ({ roomId } = {}, ack) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      if (!room?.warArena || !user) { ack?.({ error: 'You are not in this battle.' }); return; }
      if (user.userId === room.ownerUserId || user.role === 'Host') { ack?.({ error: 'Use End Codewar to close the battle as host.' }); return; }
      leaveVoice();
      const player = getWarParticipant(room, user);
      if (player) {
        room.warArena.teams = normalizeWarTeams(room.warArena.teams);
        if (player.team === 'LOOP' || player.team === 'SIDER') {
          room.warArena.teams[player.team] = room.warArena.teams[player.team].filter(id => id !== player.id);
        }
        player.team = 'NONE';
        player.isOnline = false;
        player.isReady = false;
        player.status = 'Left room';
        player.lastSeenAt = Date.now();
      }
      if (room.warArena.status === 'COUNTDOWN') {
        room.warArena.status = 'READY_CHECK';
        room.warArena.countdownStartsAt = null;
        room.warArena.startsAt = null;
        room.warArena.endsAt = null;
        addWarActivity(room, `${user.name} left; countdown canceled until both teams are full again`);
      }
      room.users = room.users.filter(member => member.socketId !== socket.id);
      socket.leave(room.id); socketUsers.delete(socket.id); userIdToRoomId.delete(user.userId);
      addWarActivity(room, `${user.name} left the battle`);
      try { await roomRepository.save(room); emitWarState(room); ack?.({ ok: true }); }
      catch { ack?.({ error: 'Could not save the departure. Please retry.' }); }
    });
    socket.on('war:end', async ({ roomId } = {}, ack) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      if (!room?.warArena || !user || !(user.userId === room.ownerUserId || user.role === 'Host')) { ack?.({ error: 'Only the host can end this Codewar.' }); return; }
      const previous = room.warArena.status;
      const members = [...(room.users || [])];
      const previousParticipants = new Map((room.warArena.participants || []).map(player => [player.id, { isOnline: player.isOnline, isReady: player.isReady, status: player.status }]));
      room.warArena.status = 'CANCELLED';
      room.warArena.resultReason = 'The host ended this Codewar.';
      for (const player of room.warArena.participants || []) {
        player.isOnline = false;
        player.isReady = false;
        player.status = 'Codewar ended';
      }
      room.users = [];
      try { await roomRepository.save(room); }
      catch {
        room.warArena.status = previous;
        room.users = members;
        for (const player of room.warArena.participants || []) {
          const prior = previousParticipants.get(player.id);
          if (prior) Object.assign(player, prior);
        }
        ack?.({ error: 'Could not end the battle. Please retry.' });
        return;
      }
      io.to(room.id).emit('war:ended', { roomId: room.id });
      for (const member of members) {
        voiceMembers.delete(member.socketId); socketUsers.delete(member.socketId); userIdToRoomId.delete(member.userId);
      }
      io.in(room.id).socketsLeave(room.id);
      saveRoomSoon(room); broadcastRooms(); ack?.({ ok: true });
    });
    socket.on('war:clock', (acknowledge) => {
      if (typeof acknowledge === 'function') acknowledge({ serverNow: Date.now() });
    });
    socket.on("user:presence", (userId) => {
      if (!userId) return;
      const wasOffline = !globalOnlineUsers.has(userId);
      socket.globalUserId = userId;
      if (!globalOnlineUsers.has(userId)) {
        globalOnlineUsers.set(userId, new Set());
      }
      globalOnlineUsers.get(userId).add(socket.id);
      if (wasOffline) {
        io.emit("presence:changed", { userId, presence: "online", emittedAt: Date.now() });
      }
    });
    socket.onAny((event, ...args) => {
      const activeEvents = ["room:join", "file:update", "file:create", "file:delete", "typing", "cursor:update", "chat:send", "mic:update", "voice:signal", "role:update"];
      if (activeEvents.includes(event)) {
        const payload = args[0];
        if (payload && payload.roomId) {
          roomRepository.markActive(payload.roomId);
        }
      }
    });

    const handleJoin = async ({ roomId, username, inviteCode, hostToken, userId, sessionId, force, profile }) => {
      // 1. Strict User ID validation
      const rawUserId = String(userId || "").trim();
      let requestUserId = (rawUserId && rawUserId !== "null" && rawUserId !== "undefined") ? rawUserId : null;
      const requestSessionId = (sessionId && String(sessionId).trim()) || null;
      const cleanInviteCode = normalizeInvite(inviteCode);
      
      console.log(`[Socket] Join request: User=${username}, ID=${requestUserId}, Force=${force}`);

      let room = roomRepository.findById(decodeURIComponent(String(roomId || "")).trim());
      
      if (!room && cleanInviteCode) {
        const byCode = roomRepository.findByInviteCode(cleanInviteCode);
        if (byCode) {
          room = byCode;
          roomId = byCode.id;
        }
      }

      if (!room) {
        socket.emit("room:error", "Room not found");
        socket.emit("room:join:failed", { reason: "not_found", roomId });
        return;
      }

      if (room.relay) {
        socket.emit('room:join:failed', { reason: 'relay_workspace', roomId: room.id });
        socket.emit('room:error', 'Open this room in the dedicated Relay workspace.');
        return;
      }
      if (room.warArena?.status === 'CANCELLED') {
        socket.emit('war:ended', { roomId: room.id });
        socket.emit('room:join:failed', { reason: 'ended', roomId: room.id });
        return;
      }
      if (room.warArena) {
        try {
          const identity = await verifySocketIdentity(socket.handshake.auth?.token, requestUserId);
          if (!identity.uid) throw new Error('Sign in to join this challenge.');
          requestUserId = identity.uid;
        } catch {
          socket.emit('room:join:failed', { reason: 'authentication_required', roomId: room.id });
          socket.emit('war:error', { message: 'Sign in again to join this challenge.' });
          socket.emit('room:error', 'Sign in again to join this challenge.');
          return;
        }
      }
      if (room.project?.status === "completed") {
        room.readOnly = true;
      }

      const isExistingUser = room.users.some(u => (requestUserId && u.userId === requestUserId) || (requestSessionId && u.sessionId === requestSessionId));
      if (!isExistingUser && room.users.length >= (room.max || 7)) {
        socket.emit("room:error", "Room is full");
        socket.emit("room:join:failed", { reason: "full", roomId });
        return;
      }


      // 2. Check for existing active session
      if (requestUserId && userIdToRoomId.has(requestUserId)) {
        const existingRoomId = userIdToRoomId.get(requestUserId);
        const isDifferentRoom = existingRoomId !== room.id;
        
        if (!force && isDifferentRoom) {
          socket.emit("room:error", "You are already active in another room.");
          socket.emit("room:join:failed", { reason: "already_in_room", roomId, existingRoomId });
          return;
        }

        const oldRoom = roomRepository.findById(existingRoomId);
        if (oldRoom) {
          const oldUser = oldRoom.users.find(u => u.userId === requestUserId && u.socketId !== socket.id);
          if (oldUser) {
            const oldSocket = io.sockets.sockets.get(oldUser.socketId);
            if (oldSocket) {
              oldSocket.leave(existingRoomId);
              oldSocket.emit("room:error", "You have joined from another tab/location.");
            }
            oldRoom.users = oldRoom.users.filter(u => u.socketId !== oldUser.socketId);
            io.to(existingRoomId).emit("presence:update", oldRoom.users);
            socketUsers.delete(oldUser.socketId);
          }
        }
        userIdToRoomId.delete(requestUserId);
        io.emit("presence:changed", { userId: requestUserId, presence: "online", emittedAt: Date.now() });
      }

      const cleanName = username?.trim() || `User-${socket.id.slice(0, 4)}`;
      const isOwner = requestUserId && room.ownerUserId && requestUserId === room.ownerUserId;
      const isAuthorizedHost = hostToken === room.hostToken || isOwner;
      const hasValidInvite = cleanInviteCode && cleanInviteCode === normalizeInvite(room.inviteCode);

      if (room.visibility === "private" && !isAuthorizedHost && !hasValidInvite) {
        socket.emit("room:error", "Private room requires a valid invite code");
        socket.emit("room:join:failed", { reason: "private_code_required", roomId: room.id });
        return;
      }
      
      // A user is a Host if they are authorized OR if they are the first user to join the empty room
      const isHost = isAuthorizedHost || room.users.length === 0;
      
      const authKey = requestUserId || requestSessionId;
      let role;
      
      if (isHost) {
        role = "Host";
      } else if (room.userRoles && authKey && room.userRoles[authKey] === "Host") {
        role = "Host";
        if (room.users.some(u => u.role === "Host")) {
          const isPublicRoom = room.visibility === "public" || room.isPublic === true;
          role = isPublicRoom ? "Viewer" : "Member"; // Downgrade if the host role was already transferred away
        }
      } else if (room.userRoles && authKey && room.userRoles[authKey] === "Member") {
        role = "Member";
      } else {
        const isPublicRoom = room.visibility === "public" || room.isPublic === true;
        role = isPublicRoom ? "Viewer" : "Member";
      }

      // Restore color from memory or assign a new one
      room.userColors = room.userColors || {};
      const activeColors = new Set(room.users.map(u => u.color));
      
      if (!room.userColors[authKey] || isHost || (role !== "Host" && activeColors.has(room.userColors[authKey]))) {
        // Force update host color just in case, but usually Host is FF7A18
        room.userColors[authKey] = assignUserColor(role, room.users);
      }
      
      const user = {
        socketId: socket.id,
        name: profile?.displayName || cleanName,
        role,
        mic: false,
        speaking: false,
        color: room.userColors[authKey],
        joinedAt: Date.now(),
        userId: requestUserId || null,
        sessionId: requestSessionId || null,
        bio: profile?.bio || null,
        photoURL: profile?.photoURL || null,
        emotionId: profile?.emotionId || null,
        stats: profile?.stats || null
      };

      socket.join(room.id);
      socketUsers.set(socket.id, room.id);
      if (requestUserId) {
        userIdToRoomId.set(requestUserId, room.id);
        io.emit("presence:changed", { userId: requestUserId, presence: "in-room", roomId: room.id, emittedAt: Date.now() });
      }

      // If the returning user is a REAL host, demote any "temporary" host
      if (isAuthorizedHost) {
        room.users.forEach(u => {
          if (u.role === "Host" && u.userId !== requestUserId) {
            u.role = "Member";
            u.color = assignUserColor("Member", room.users);
          }
        });
      }

      // Final cleanup to prevent duplicates
      room.users = room.users.filter(u => u.socketId !== socket.id && (!requestUserId || u.userId !== requestUserId) && (!requestSessionId || u.sessionId !== requestSessionId));

      room.users.push(user);
      if (room.warArena) {
        activateAndEmitWar(room);
        finishWarBattle(room.warArena);
        syncWarParticipant(room, user);
        addWarActivity(room, `${user.name} joined the arena`);
      }
      socket.emit("room:state", roomService.snapshot(room));
      io.to(room.id).emit("presence:update", room.users);
      emitWarState(room);
      if (room.warArena) emitWarTeamCodeToParticipant(room, user);
      broadcastRooms();
      
      if (requestUserId && profileController) {
        profileController.addActivity(requestUserId, {
          type: "room_join",
          text: `Joined ${room.name}`,
          subtext: room.problemId ? "Problem Solving" : "Collaboration"
        }).catch(e => console.warn("Failed to log room join activity", e));
      }
    };

    socket.on("room:join", (data) => handleJoin(data));
    socket.on("room:join:force", (data) => handleJoin({ ...data, force: true }));

    socket.on("room:settings", ({ roomId, max, visibility, allowAi, allowCopyPaste }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      const authorized = Boolean(room && ((user && user.role === "Host") || (user?.userId && room.ownerUserId && user.userId === room.ownerUserId)));
      if (!room || room.relay || !authorized) return;

      if (max !== undefined) {
        const newMax = Math.max(room.users.length, Math.min(Number(max) || 7, 7));
        room.max = newMax;
      }
      
      if (visibility === "public" || visibility === "private") {
        room.visibility = visibility;
      }

      if (allowAi !== undefined) {
        room.allowAi = Boolean(allowAi);
      }

      if (allowCopyPaste !== undefined) {
        room.allowCopyPaste = Boolean(allowCopyPaste);
      }

      roomRepository.save(room).catch((error) => console.warn(`Room persistence failed: ${error.message}`));
      io.to(roomId).emit("room:state", roomService.snapshot(room));
      broadcastRooms();
    });

    socket.on("room:set_problem", ({ roomId, problemId, targetImage, challengeId, challengeDifficulty }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      const authorized = Boolean(room && ((user && user.role === "Host") || (user?.userId && room.ownerUserId && user.userId === room.ownerUserId)));
      console.log(`room:set_problem -> roomId: ${roomId}, problemId: ${problemId}, user: ${user?.name}, role: ${user?.role}, authorized: ${authorized}`);
      if (!room || room.relay || !authorized) return;

      room.problemId = problemId;
      room.isChallenge = problemId === "ui-battle" || Boolean(targetImage || challengeId);
      if (targetImage) {
        room.targetImage = targetImage;
      }
      if (challengeId) {
        room.challengeId = challengeId;
      }
      if (challengeDifficulty) {
        room.challengeDifficulty = challengeDifficulty;
      }
      roomRepository.save(room).catch((error) => console.warn(`Room persistence failed: ${error.message}`));
      io.to(roomId).emit("room:state", roomService.snapshot(room));
      broadcastRooms();
    });

    socket.on("war:team:join", ({ roomId, team }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      const participant = room?.warArena && user && getWarParticipant(room, user);
      const nextTeam = team === "LOOP" || team === "SIDER" ? team : null;
      if (!room?.warArena || !user || !participant || !nextTeam) return;
      if (["COUNTDOWN", "ACTIVE", "JUDGING", "COMPLETED", "CANCELLED"].includes(room.warArena.status)) {
        socket.emit("war:error", { message: "Teams are locked for this battle." });
        return;
      }

      room.warArena.teams = normalizeWarTeams(room.warArena.teams);
      const capacity = Number(room.warArena.teamSize) || 1;
      const currentTeam = participant.team;
      const alreadyOnTeam = currentTeam === nextTeam;
      const nextMembers = room.warArena.teams[nextTeam].filter((key) => key !== participant.id);
      if (!alreadyOnTeam && nextMembers.length >= capacity) {
        socket.emit("war:error", { message: `Team ${capitalizeWord(nextTeam)} is full.` });
        return;
      }

      if (currentTeam === "LOOP" || currentTeam === "SIDER") {
        room.warArena.teams[currentTeam] = room.warArena.teams[currentTeam].filter((key) => key !== participant.id);
      }
      room.warArena.teams[nextTeam] = [...nextMembers, participant.id];
      participant.team = nextTeam;
      participant.role = participant.role === "HOST" ? "HOST" : "PLAYER";
      participant.isReady = false;
      room.warArena.status = "READY_CHECK";
      addWarActivity(room, `${participant.name} joined Team ${capitalizeWord(nextTeam)}`);
      saveAndEmitWarState(room);
      emitWarTeamCodeToParticipant(room, user);
    });

    socket.on("war:ready", ({ roomId, ready }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      const participant = room?.warArena && user && getWarParticipant(room, user);
      if (!room?.warArena || !participant) return;
      if (!participant.team || participant.team === "NONE") {
        socket.emit("war:error", { message: "Join a team before marking ready." });
        return;
      }
      if (["COUNTDOWN", "ACTIVE", "JUDGING", "COMPLETED", "CANCELLED"].includes(room.warArena.status)) return;
      participant.isReady = Boolean(ready);
      room.warArena.status = "READY_CHECK";
      addWarActivity(room, `${participant.name} is ${participant.isReady ? "ready" : "not ready"}`);
      saveAndEmitWarState(room);
    });

    socket.on("war:start_countdown", ({ roomId }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      const authorized = Boolean(room?.warArena && user && (user.role === "Host" || user.userId === room.ownerUserId));
      if (!authorized) {
        socket.emit("war:error", { message: "Only the host can start the battle." });
        return;
      }
      if (!['WAITING', 'READY_CHECK'].includes(room.warArena.status)) return;
      const readiness = getWarReadiness(room);
      if (!readiness.canStart) {
        socket.emit("war:error", { message: readiness.reason });
        return;
      }

      const now = Date.now();
      room.warArena.status = "COUNTDOWN";
      room.warArena.countdownStartsAt = now;
      room.warArena.startsAt = now + 5000;
      room.warArena.endsAt = room.warArena.startsAt + ((Number(room.warArena.timeLimitSeconds) || 1800) * 1000);
      addWarActivity(room, "Countdown started");
      saveAndEmitWarState(room);
      io.to(room.id).emit("countdown:started", {
        roomId: room.id,
        serverNow: Date.now(),
        startsAt: room.warArena.startsAt,
        endsAt: room.warArena.endsAt
      });

      setTimeout(() => {
        const freshRoom = roomRepository.findById(room.id);
        activateAndEmitWar(freshRoom);
      }, Math.max(0, room.warArena.startsAt - Date.now())).unref?.();
    });

    socket.on("war:code:update", ({ roomId, code }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      const participant = room?.warArena && user && getWarParticipant(room, user);
      if (!room?.warArena || !participant || !["LOOP", "SIDER"].includes(participant.team)) return;
      activateAndEmitWar(room);
      if (finishWarBattle(room.warArena)) saveAndEmitWarState(room);
      if (!["ACTIVE", "READY_CHECK"].includes(room.warArena.status)) return;
      const nextCode = String(code ?? "");
      if (Buffer.byteLength(nextCode, "utf8") > 200000) {
        socket.emit("war:error", { message: "Code is too large to sync." });
        return;
      }
      ensureWarBattleState(room);
      room.warArena.teamCode[participant.team] = nextCode;
      if (participant.status !== 'Editing') addWarActivity(room, `${participant.name} is editing for Team ${capitalizeWord(participant.team)}`);
      participant.status = "Editing";
      emitWarState(room);
      emitWarTeamCode(room, participant.team);
      saveRoomSoon(room);
    });

    socket.on("war:progress:update", ({ roomId }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      const participant = room?.warArena && user && getWarParticipant(room, user);
      if (!room?.warArena || !participant || !["LOOP", "SIDER"].includes(participant.team)) return;
      if (finishWarBattle(room.warArena)) saveAndEmitWarState(room);
      // Scores, attempts and progress are exclusively produced by the authenticated judge.
    });

    socket.on("war:team_message", ({ roomId, text }, ack) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      const participant = room?.warArena && user && getWarParticipant(room, user);
      if (!room?.warArena || !participant || !["LOOP", "SIDER"].includes(participant.team)) { ack?.({ error: 'Join a team to send messages.' }); return; }
      const cleanText = String(text || "").trim().slice(0, 500);
      if (!cleanText) return;
      ensureWarBattleState(room);
      const message = {
        id: cryptoId(),
        roomId: room.id,
        team: participant.team,
        senderId: participant.id,
        senderName: participant.name,
        text: cleanText,
        createdAt: Date.now()
      };
      room.warArena.teamMessages[participant.team].push(message);
      room.warArena.teamMessages[participant.team] = room.warArena.teamMessages[participant.team].slice(-80);
      emitWarTeamMessage(room, participant.team, message);
      saveRoomSoon(room);
      ack?.({ ok: true });
    });


    socket.on("role:update", ({ roomId, targetSocketId, role }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      const target = room && roomService.findUser(room, targetSocketId);
      if (!room || !user || !target || user.role !== "Host" || target.socketId === user.socketId) return;
      if (role === "Host") {
        user.role = "Member";
        user.color = assignUserColor("Member", room.users);
        target.role = "Host";
        target.color = "#FF7A18";
        target.mic = Boolean(target.mic);
        target.speaking = Boolean(target.speaking);
        room.hostName = target.name;
        io.to(target.socketId).emit("host:token", { roomId, hostToken: room.hostToken });
      } else {
        if (target.role === "Host") return;
        target.role = role === "Member" ? "Member" : "Viewer";
        target.color = assignUserColor(target.role, room.users);
      }
      if (target.role === "Viewer") {
        target.mic = false;
        target.speaking = false;
      }
      
      // Persist the roles so they survive reconnections
      if (!room.userRoles) room.userRoles = {};
      const targetAuthKey = target.userId || target.sessionId;
      const userAuthKey = user.userId || user.sessionId;
      if (targetAuthKey) room.userRoles[targetAuthKey] = target.role;
      if (userAuthKey) room.userRoles[userAuthKey] = user.role;

      io.to(roomId).emit("presence:update", room.users);
      roomRepository.save(room).catch((error) => console.warn(`Room persistence failed: ${error.message}`));
    });

    socket.on("room:kick", ({ roomId, targetSocketId, hostToken }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      const target = room && roomService.findUser(room, targetSocketId);
      const authorized = Boolean(room && ((user && user.role === "Host") || (user?.userId && room.ownerUserId && user.userId === room.ownerUserId) || hostToken === room.hostToken));
      if (!room || !target || !authorized || target.role === "Host") return;

      room.users = room.users.filter((existing) => existing.socketId !== targetSocketId);
      if (target.userId) {
        userIdToRoomId.delete(target.userId);
      }

      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.emit("room:kicked", { roomId, reason: "kicked" });
        setTimeout(() => {
          socketUsers.delete(targetSocketId);
          targetSocket.disconnect(true);
        }, 50);
      }

      io.to(roomId).emit("presence:update", room.users);
      roomRepository.save(room).catch((error) => console.warn(`Room persistence failed: ${error.message}`));
      broadcastRooms();
    });

      socket.on("file:update", ({ roomId, fileName, code }) => {
        if (code && typeof code === "string" && Buffer.byteLength(code, 'utf8') > 200000) {
          socket.emit("room:error", "File is too large to sync (max 200KB).");
          return;
        }
        const room = roomRepository.findById(roomId);
        const user = room && roomService.findUser(room, socket.id);
        if (!room || room.relay || room.readOnly || room.project?.status === "completed" || !user || user.role === "Viewer") return;
        const file = room.files.find((item) => item.name === fileName);
        if (!file) return;
        file.code = code;
        saveRoomSoon(room);
        // Broadcast the update so users viewing other files receive the changes in the background
        socket.to(roomId).emit("file:update", { fileName, code });
      });

    socket.on("file:create", ({ roomId, fileName, language, code }) => {
      console.log(`[Socket] file:create requested by ${socket.id} for file ${fileName}`);
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      if (!room || room.relay || room.readOnly || room.project?.status === "completed" || !user || user.role === "Viewer" || !fileName?.trim()) {
        console.log(`[Socket] file:create REJECTED. Room: ${!!room}, User: ${!!user}, Role: ${user?.role}`);
        return;
      }
      if (!roomService.addFile(room, fileName, language, code)) return;
      roomRepository.save(room).catch((error) => console.warn(`Room persistence failed: ${error.message}`));
      io.to(roomId).emit("files:update", room.files);
    });

    socket.on("file:delete", ({ roomId, fileName }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      if (!room || room.relay || room.readOnly || room.project?.status === "completed" || !user || user.role === "Viewer") return;
      if (!roomService.removeFile(room, fileName)) return;
      roomRepository.save(room).catch((error) => console.warn(`Room persistence failed: ${error.message}`));
      io.to(roomId).emit("files:update", room.files);
    });

    socket.on("file:rename", ({ roomId, oldFileName, newFileName, language, code }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      if (!room || room.relay || room.readOnly || room.project?.status === "completed" || !user || user.role === "Viewer" || !oldFileName || !newFileName?.trim()) return;

      const file = room.files.find((f) => f.name === oldFileName);
      if (!file) return;

      file.name = newFileName.trim().replace(/[\\/]/g, "");
      if (language) file.language = language;
      if (code !== undefined) file.code = code;

      roomRepository.save(room).catch((error) => console.warn(`Room persistence failed: ${error.message}`));
      io.to(roomId).emit("files:update", room.files);
    });

    socket.on("typing", ({ roomId, fileName, position, isTyping }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      if (room && user) io.to(room.id).emit("typing", { user: user.name, userId: socket.id, socketId: socket.id, color: user.color, fileName, position, isTyping });
    });

    socket.on("cursor:update", ({ roomId, fileName, position, isTyping }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      if (room && user) io.to(room.id).emit("cursor:update", { user: user.name, userId: socket.id, socketId: socket.id, color: user.color, fileName, position, isTyping });
    });

    socket.on("chat:send", ({ roomId, text, clientId, stickerId }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      const cleanText = String(text || "").trim();
      const cleanStickerId = String(stickerId || "").trim();
      if (!room || room.warArena || !user || (!cleanText && !cleanStickerId)) return;
      const message = {
        id: cryptoId(),
        clientId: String(clientId || ""),
        user: user.name,
        text: cleanText,
        stickerId: cleanStickerId || null,
        type: cleanStickerId ? "sticker" : "text",
        createdAt: Date.now()
      };
      room.messages.push(message);
      if (room.messages.length > 200) room.messages = room.messages.slice(-200);
      roomRepository.save(room).catch((error) => console.warn(`Room persistence failed: ${error.message}`));
      io.to(room.id).emit("chat:message", message);
    });

    socket.on("mic:update", ({ roomId, mic, speaking }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      if (!room || room.warArena || room.relay || room.readOnly || room.project?.status === "completed" || !user || user.role === "Viewer") return;
      user.mic = Boolean(mic);
      user.speaking = Boolean(speaking);
      io.to(roomId).emit("presence:update", room.users);
    });

    socket.on("voice:signal", ({ roomId, target, signal }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      if (!room || room.warArena || !user || !roomService.findUser(room, target)) return;
      socket.to(target).emit("voice:signal", { from: socket.id, signal, user: user.name });
    });
    
    socket.on("notes:update", ({ roomId, text }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      if (!room || room.relay || room.readOnly || room.project?.status === "completed" || !user || user.role === "Viewer") return;
      if (!room.notes) room.notes = { text: "", draws: [] };
      room.notes.text = text;
      roomRepository.save(room).catch(e => console.warn(`Room persistence failed: ${e.message}`));
      socket.to(roomId).emit("notes:update", room.notes);
    });

    socket.on("notes:draw", ({ roomId, draw }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      if (!room || room.relay || room.readOnly || !user || user.role === "Viewer") return;
      if (!room.notes) room.notes = { text: "", draws: [] };
      
      if (draw === "clear") {
        room.notes.draws = [];
      } else {
        room.notes.draws.push(draw);
        if (room.notes.draws.length > 2000) room.notes.draws = room.notes.draws.slice(-2000);
      }
      
      roomRepository.save(room).catch(e => console.warn(`Room persistence failed: ${e.message}`));
      socket.to(roomId).emit("notes:draw", draw);
    });

    socket.on("timer:start", ({ roomId, duration, mode }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      if (!room || !user || user.role !== "Host") return;
      
      const isStopwatch = mode === "stopwatch" || room.timer?.mode === "stopwatch";
      
      if (isStopwatch) {
        room.timer = { startTime: Date.now(), mode: "stopwatch", isRunning: true };
      } else {
        const endTime = Date.now() + (duration * 1000);
        room.timer = { endTime, duration, mode: "timer", isRunning: true };
      }
      io.to(roomId).emit("timer:sync", room.timer);
    });

    socket.on("timer:stop", ({ roomId }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      if (!room || !user || user.role !== "Host") return;
      
      room.timer = { 
        ...room.timer,
        endTime: null, 
        startTime: null,
        duration: room.timer?.duration || 25 * 60, 
        isRunning: false 
      };
      io.to(roomId).emit("timer:sync", room.timer);
    });

    socket.on("timer:mode", ({ roomId, mode }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      if (!room || !user || user.role !== "Host") return;
      
      room.timer = { 
        mode,
        endTime: null,
        startTime: null,
        duration: room.timer?.duration || 25 * 60,
        isRunning: false 
      };
      io.to(roomId).emit("timer:sync", room.timer);
    });

    socket.on("history:push", ({ roomId }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      if (!room || room.relay || room.readOnly || !user || user.role === "Viewer") return;
      
      roomService.addToHistory(room, user);
      io.to(roomId).emit("history:update", (room.history || []).slice(-10));
    });

    socket.on("room:end", ({ roomId }) => {
      const room = roomRepository.findById(roomId);
      if (room?.warArena) return;
      const user = room && roomService.findUser(room, socket.id);
      const isProjectRoom = Boolean(room?.project);
      const authorized = isProjectRoom
        ? Boolean(room.project.status === "completed" && user?.userId && user.userId === room.ownerUserId)
        : Boolean(room && (user?.role === "Host" || (user?.userId && room.ownerUserId && user.userId === room.ownerUserId)));
      if (!room || room.relay || !authorized) return;

      console.log(`room:end - host closing room ${roomId}`);
      
      // Cleanup all authenticated users' room tracking before deleting
      if (room.users) {
        room.users.forEach(u => {
          if (u.userId) userIdToRoomId.delete(u.userId);
          socketUsers.delete(u.socketId);
        });
      }

      if (isProjectRoom) {
        room.archivedAt = room.archivedAt || Date.now();
        roomRepository.save(room).catch((error) => console.warn(`Project archive failed: ${error.message}`));
        io.to(roomId).emit("room:ended", { projectEnded: true, ownerUserId: room.ownerUserId });
      } else {
        roomRepository.delete(roomId).catch((error) => console.warn(`Room deletion failed: ${error.message}`));
        io.to(roomId).emit("room:ended");
      }
      broadcastRooms();
    });

    socket.on("disconnect", async () => {
      await detachRelay({ persist: true });
      if (socket.globalUserId && globalOnlineUsers.has(socket.globalUserId)) {
        const userSockets = globalOnlineUsers.get(socket.globalUserId);
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          globalOnlineUsers.delete(socket.globalUserId);
          io.emit("presence:changed", { userId: socket.globalUserId, presence: "offline", emittedAt: Date.now() });
        }
      }

      const roomId = socketUsers.get(socket.id);
      const room = roomId && roomRepository.findById(roomId);
      socketUsers.delete(socket.id);
      if (!room) return;
      
      const disconnectingUser = room.users.find((user) => user.socketId === socket.id);
      if (room.warArena && disconnectingUser) {
        const participant = getWarParticipant(room, disconnectingUser);
        if (participant) {
          participant.isOnline = false;
          participant.lastSeenAt = Date.now();
          participant.isReady = false;
          addWarActivity(room, `${participant.name} disconnected`);
          emitWarState(room);
        }
      }
      if (disconnectingUser && disconnectingUser.userId) {
        userIdToRoomId.delete(disconnectingUser.userId);
        const stillOnline = globalOnlineUsers.has(disconnectingUser.userId);
        io.emit("presence:changed", {
          userId: disconnectingUser.userId,
          presence: stillOnline ? "online" : "offline",
          emittedAt: Date.now()
        });
      }
      
      room.users = room.users.filter((user) => user.socketId !== socket.id);
      
      // If the disconnecting user was NOT a Host, and there is exactly 1 user left, they should become the Host.
      // (If the disconnecting user WAS a Host, the 3-second grace period below handles the transfer).
      if (disconnectingUser?.role !== "Host" && room.users.length === 1 && room.users[0].role !== "Host") {
        room.users[0].role = "Host";
        room.users[0].color = "#FF7A18";
        room.hostName = room.users[0].name;
        console.log(`[Host Promotion] Only one user left in ${roomId}, promoting to Host`);
      }
      
      // GRACE PERIOD: Wait 3 seconds before transferring host role
      // This prevents losing the host role during a quick page refresh
      if (disconnectingUser?.role === "Host" && room.users.length > 0) {
        setTimeout(() => {
          const freshRoom = roomRepository.findById(roomId);
          if (!freshRoom) return;
          
          // Check if the host has already joined back
          const hostIsBack = freshRoom.users.some(u => u.role === "Host");
          if (!hostIsBack && freshRoom.users.length > 0) {
            const oldest = [...freshRoom.users].sort((a,b) => a.joinedAt - b.joinedAt)[0];
            oldest.role = "Host";
            oldest.color = "#FF7A18";
            freshRoom.hostName = oldest.name;
            console.log(`[Host Disconnect] Transferred host of ${roomId} to ${oldest.name} after grace period`);
            io.to(roomId).emit("presence:update", freshRoom.users);
            broadcastRooms();
          }
        }, 3000);
      }
      
      socket.to(room.id).emit("presence:update", room.users);
      roomRepository.save(room).catch(e => console.warn(`Room persistence failed: ${e.message}`));
      broadcastRooms();
    });
  });
}

function normalizeInvite(inviteCode) {
  return String(inviteCode || "").replace(/\s+/g, "").trim().toUpperCase();
}

function syncWarParticipant(room, user) {
  room.warArena.participants = Array.isArray(room.warArena.participants) ? room.warArena.participants : [];
  const participantId = getWarParticipantId(user);
  let participant = room.warArena.participants.find((item) => item.id === participantId);
  if (!participant) {
    participant = {
      id: participantId,
      userId: user.userId || null,
      sessionId: user.sessionId || null,
      socketId: user.socketId,
      name: user.name,
      photoURL: user.photoURL || null,
      role: user.role === "Host" ? "HOST" : "PLAYER",
      team: "NONE",
      isReady: false,
      isOnline: true,
      joinedAt: Date.now(),
      lastSeenAt: Date.now(),
      score: 0,
      attempts: 0,
      progress: 0,
      status: "Waiting"
    };
    room.warArena.participants.push(participant);
  } else {
    participant.socketId = user.socketId;
    participant.name = user.name;
    participant.photoURL = user.photoURL || participant.photoURL || null;
    participant.role = user.role === "Host" || participant.role === "HOST" ? "HOST" : "PLAYER";
    participant.isOnline = true;
    participant.lastSeenAt = Date.now();
  }
  room.warArena.teams = normalizeWarTeams(room.warArena.teams);
  return participant;
}

function getWarParticipant(room, user) {
  const participantId = getWarParticipantId(user);
  return room.warArena.participants?.find((item) => item.id === participantId || item.socketId === user.socketId);
}

function getWarParticipantId(user) {
  return String(user.userId || user.sessionId || user.socketId || "").trim();
}

function normalizeWarTeams(teams) {
  return {
    LOOP: Array.isArray(teams?.LOOP) ? teams.LOOP : [],
    SIDER: Array.isArray(teams?.SIDER) ? teams.SIDER : []
  };
}

function getWarReadiness(room) {
  const arena = room.warArena;
  arena.teams = normalizeWarTeams(arena.teams);
  const participants = Array.isArray(arena.participants) ? arena.participants : [];
  const capacity = Number(arena.teamSize) || 1;
  const loop = arena.teams.LOOP.map((id) => participants.find((item) => item.id === id)).filter(Boolean);
  const sider = arena.teams.SIDER.map((id) => participants.find((item) => item.id === id)).filter(Boolean);
  const players = [...loop, ...sider];
  if (loop.length < capacity) return { canStart: false, reason: "Waiting for Team Loop to fill" };
  if (sider.length < capacity) return { canStart: false, reason: "Waiting for Team Sider to fill" };
  if (players.some((player) => !player.isOnline)) return { canStart: false, reason: "A player is offline" };
  const readyCount = players.filter((player) => player.isReady).length;
  if (readyCount < players.length) return { canStart: false, reason: `Waiting for ${players.length - readyCount} players to be ready` };
  return { canStart: true, reason: "Ready" };
}

function ensureWarBattleState(room) {
  if (!room?.warArena) return;
  room.warArena.teamCode = {
    LOOP: typeof room.warArena.teamCode?.LOOP === "string" && room.warArena.teamCode.LOOP.trim() ? room.warArena.teamCode.LOOP : getDefaultWarCode(room.warArena),
    SIDER: typeof room.warArena.teamCode?.SIDER === "string" && room.warArena.teamCode.SIDER.trim() ? room.warArena.teamCode.SIDER : getDefaultWarCode(room.warArena)
  };
  room.warArena.teamMessages = {
    LOOP: Array.isArray(room.warArena.teamMessages?.LOOP) ? room.warArena.teamMessages.LOOP : [],
    SIDER: Array.isArray(room.warArena.teamMessages?.SIDER) ? room.warArena.teamMessages.SIDER : []
  };
}

function emitWarTeamCode(room, team) {
  ensureWarBattleState(room);
  const sockets = getWarTeamSockets(room, team);
  sockets.forEach((socketId) => {
    warRealtimeIO?.to(socketId).emit("war:team_code", {
      roomId: room.id,
      team,
      code: room.warArena.teamCode[team],
      messages: room.warArena.teamMessages[team] || []
    });
  });
}

function emitWarTeamCodeToParticipant(room, user) {
  const participant = room?.warArena && getWarParticipant(room, user);
  if (!participant || !["LOOP", "SIDER"].includes(participant.team)) return;
  ensureWarBattleState(room);
  warRealtimeIO?.to(user.socketId).emit("war:team_code", {
    roomId: room.id,
    team: participant.team,
    code: room.warArena.teamCode[participant.team],
    messages: room.warArena.teamMessages[participant.team] || []
  });
}

function emitWarTeamMessage(room, team, message) {
  getWarTeamSockets(room, team).forEach((socketId) => {
    warRealtimeIO?.to(socketId).emit("war:team_message", { ...message, roomId: room.id, team });
  });
}

function getWarTeamSockets(room, team) {
  const participantIds = new Set(normalizeWarTeams(room.warArena?.teams)[team] || []);
  return (room.warArena?.participants || [])
    .filter((participant) => participantIds.has(participant.id) && participant.socketId)
    .map((participant) => participant.socketId);
}

function getDefaultWarCode(arena) {
  const language = String(arena?.language || "Java").toLowerCase();
  const battleType = String(arena?.battleType || "programming").toLowerCase();
  if (battleType === "mcqs" || language.includes("no language")) {
    return "1. \n2. \n\n# Write one option per line.";
  }
  if (language.includes("html")) {
    return "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\" />\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n  <title>Code War Arena</title>\n</head>\n<body>\n  <main class=\"hero\">\n    <h1>Code together. Instantly.</h1>\n    <button class=\"launch-btn\">Launch room</button>\n  </main>\n</body>\n</html>";
  }
  if (language.includes("react")) {
    return "import { useState } from \"react\";\n\nexport default function App() {\n  const [score, setScore] = useState(0);\n\n  return (\n    <main>\n      <h1>Code War Arena</h1>\n      <p>Score: {score}</p>\n      <button onClick={() => setScore(score + 1)}>Add</button>\n    </main>\n  );\n}";
  }
  if (language.includes("python")) {
    if (battleType === "debugging") {
      return "def solve(nums):\n    # Bug: this only returns the first number. Fix it.\n    return nums[0]\n\nn = int(input())\nnums = list(map(int, input().split()))\nprint(solve(nums))";
    }
    return "def solve():\n    # write your solution here\n    pass\n\nsolve()";
  }
  if (language.includes("c++")) {
    if (battleType === "debugging") {
      return "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    vector<int> nums(n);\n    for (int &x : nums) cin >> x;\n    // Bug: this prints the count instead of the required answer. Fix it.\n    cout << n << \"\\n\";\n    return 0;\n}";
    }
    return "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // write your solution here\n    return 0;\n}";
  }
  if (language.includes("javascript") || language.includes("react")) {
    if (battleType === "saboteur") {
      return "const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nfunction solve(nums) {\n  // Sabotage: this skips the first value. Fix it.\n  return nums.slice(1).reduce((sum, value) => sum + value, 0);\n}\nconsole.log(solve(input.slice(1)));";
    }
    if (battleType === "full-stack") {
      return "const feedback = [];\n\nfunction submitFeedback(text) {\n  // validate and store feedback here\n}\n\nfunction renderFeedback() {\n  return feedback.map((item) => `<li>${item}</li>`).join(\"\");\n}";
    }
    return "function solve() {\n  // write your solution here\n}\n\nconsole.log(solve());";
  }
  if (battleType === "debugging") {
    return "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();\n        // Bug: this prints n. Fix the broken logic.\n        System.out.println(n);\n    }\n}";
  }
  return "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // write your solution here\n    }\n}";
}

function addWarActivity(room, text) {
  if (!room.warArena) return;
  room.warArena.activity = Array.isArray(room.warArena.activity) ? room.warArena.activity : [];
  room.warArena.activity.push({
    id: cryptoId(),
    text: String(text || "").slice(0, 160),
    createdAt: Date.now()
  });
  room.warArena.activity = room.warArena.activity.slice(-80);
}

function capitalizeWord(value) {
  const clean = String(value || "").toLowerCase();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}
