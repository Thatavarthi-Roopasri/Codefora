import { globalOnlineUsers } from "./presenceTracker.js";

let realtimeIO = null;

export function setRealtimeIO(io) {
  realtimeIO = io || null;
}

export function emitToUser(userId, eventName, payload = {}) {
  const cleanUserId = String(userId || "").trim();
  if (!realtimeIO || !cleanUserId || !eventName) return 0;

  const sockets = globalOnlineUsers.get(cleanUserId);
  if (!sockets || sockets.size === 0) return 0;

  let delivered = 0;
  for (const socketId of sockets) {
    realtimeIO.to(socketId).emit(eventName, {
      userId: cleanUserId,
      ...payload,
      emittedAt: Date.now()
    });
    delivered += 1;
  }
  return delivered;
}

export function emitNotificationRefresh(userId, reason = "updated") {
  return emitToUser(userId, "notifications:refresh", { reason });
}

export function emitFriendsRefresh(userId, reason = "updated") {
  return emitToUser(userId, "friends:refresh", { reason });
}
