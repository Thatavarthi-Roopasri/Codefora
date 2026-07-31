// Tracks global online presence across the site
// Map<userId, Set<socketId>>
export const globalOnlineUsers = new Map();

// Tracks which room a user is currently inside
// Map<userId, roomId>
export const userIdToRoomId = new Map();
