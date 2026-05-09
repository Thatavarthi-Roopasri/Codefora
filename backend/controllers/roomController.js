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
    list: (_request, response) => {
      const all = roomRepository.listAll();
      response.json(all.map((room) => roomService.publicRoom(room)));
    },
    create: async (request, response) => {
      try {
        const room = roomService.createRoom(request.body || {});
        await roomRepository.save(room);
        
        if (room.ownerUserId && profileController?.incrementStat) {
          profileController.incrementStat(room.ownerUserId, "roomsJoined");
        }

        if (onRoomCreated) onRoomCreated();

        response.status(201).json({ ...roomService.publicRoom(room), hostToken: room.hostToken, inviteCode: room.inviteCode });
      } catch (error) {
        response.status(400).json({ error: error.message });
      }
    },
    get: (request, response) => {
      const room = roomRepository.findById(request.params.id);
      if (!room) return response.status(404).json({ error: "Room not found" });

      if (room.visibility === "private") {
        const { inviteCode, hostToken } = request.query;
        const normalizedInvite = inviteCode ? String(inviteCode).replace(/\s+/g, "").trim().toUpperCase() : null;
        if (room.inviteCode !== normalizedInvite && room.hostToken !== hostToken) {
           return response.status(403).json({ error: "Private room requires a valid invite code" });
        }
      }

      response.json(roomService.snapshot(room));
    },
    findByInviteCode: (request, response) => {
      const room = roomRepository.findByInviteCode(request.params.code);
      if (!room) return response.status(404).json({ error: "Room not found" });
      response.json(roomService.snapshot(room));
    }
  };
}
