import { activateWarBattle, assignWarProblem, finishWarBattle } from '../services/warBattleService.js';

export function createRoomController(roomRepository, roomService, profileController, onRoomCreated) {
  const windowMs = 10 * 60 * 1000;
  const maxRequests = 5;
  const buckets = new Map();

  function rateLimit(request, response, next) {
    const key = request.ip || request.headers["x-forwarded-for"] || "anonymous";
    const now = Date.now();
    const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

    if (bucket.resetAt <= now) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > maxRequests) {
      return response.status(429).json({
        error: "Too many rooms created recently. Please try again later.",
        status: "rate_limited",
        retryAfterMs: Math.max(0, bucket.resetAt - now)
      });
    }

    next();
  }

  return {
    rateLimit,
    list: (request, response) => {
      const all = roomRepository.listAll().filter(room => room.warArena?.status !== 'CANCELLED' && String(room.relay?.status || '').toUpperCase() !== 'ENDED' && !room.relay?.endedAt);
      response.json(all.map((room) => roomService.publicRoom(room, request.firebaseUser?.uid || null)));
    },
    create: async (request, response) => {
      try {
        if ((request.body?.warArena || request.body?.relayMode) && !request.firebaseUser?.uid) return response.status(401).json({ error: 'Sign in to create a battle or relay.' });
        const room = roomService.createRoom({
          ...(request.body || {}),
          userId: request.firebaseUser?.uid || request.body?.userId || null,
        });
        if (room.warArena) {
          Object.assign(room.warArena, { status: 'WAITING', teams: { LOOP: [], SIDER: [] }, participants: [], startsAt: null, endsAt: null, completedAt: null, winningTeam: null, resultReason: null, teamCode: { LOOP: '', SIDER: '' }, teamMessages: { LOOP: [], SIDER: [] }, activity: [] });
          await assignWarProblem(room.warArena);
        }
        await roomRepository.save(room);
        
        if (room.ownerUserId && profileController?.incrementStat) {
          profileController.incrementStat(room.ownerUserId, "roomsJoined");
        }

        if (onRoomCreated) onRoomCreated();

        response.status(201).json({ ...roomService.snapshot(room), hostToken: room.hostToken, inviteCode: room.inviteCode });
      } catch (error) {
        response.status(400).json({ error: error.message });
      }
    },
    get: async (request, response) => {
      const room = roomRepository.findById(request.params.id);
      if (!room) return response.status(404).json({ error: "Room not found" });

      if (room.visibility === "private") {
        const { inviteCode, hostToken } = request.query;
        const normalizedInvite = inviteCode ? String(inviteCode).replace(/\s+/g, "").trim().toUpperCase() : null;
        const isOwner = Boolean(request.firebaseUser?.uid && room.ownerUserId && request.firebaseUser.uid === room.ownerUserId);
        if (!isOwner && room.inviteCode !== normalizedInvite && room.hostToken !== hostToken) {
           return response.status(403).json({ error: "Private room requires a valid invite code" });
        }
      }

      const battleActivated = activateWarBattle(room.warArena);
      if (finishWarBattle(room.warArena) || battleActivated) {
        if (profileController?.recordCompetitiveResult && room.warArena.status === "COMPLETED" && !room.warArena.statsRecordedAt) {
          room.warArena.statsRecordedAt = Date.now();
          const mode = room.warArena.battleType === "mcqs" ? "blind" : "battles";
          await Promise.all((room.warArena.participants || []).map((participant) => profileController.recordCompetitiveResult(participant.userId, {
            mode,
            matchId: `battle:${room.id}`,
            won: Boolean(room.warArena.winningTeam && participant.team === room.warArena.winningTeam)
          })));
        }
        await roomRepository.save(room);
      }
      response.json(roomService.snapshot(room));
    },
    findByInviteCode: (request, response) => {
      const room = roomRepository.findByInviteCode(request.params.code);
      if (!room) return response.status(404).json({ error: "Room not found" });
      if (room.relay?.status === 'ENDED') return response.status(410).json({ error: "This Relay has ended" });
      response.json(roomService.snapshot(room));
    }
  };
}
