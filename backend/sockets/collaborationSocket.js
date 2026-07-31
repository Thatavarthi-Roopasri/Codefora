import { cryptoId } from "../utils/id.js";
import { globalOnlineUsers, userIdToRoomId } from "../utils/presenceTracker.js";

const MEMBER_COLORS = ["#00E5FF", "#FF9100", "#FF007F", "#B400FF", "#00FF00", "#FFEA00", "#FF0000", "#00FFCC"];
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
  const socketUsers = new Map();
  const broadcastRooms = () => io.emit("rooms:update", roomRepository.allPublicSummaries((room) => roomService.publicRoom(room)));

  io.on("connection", (socket) => {
    socket.on("user:presence", (userId) => {
      if (!userId) return;
      socket.globalUserId = userId;
      if (!globalOnlineUsers.has(userId)) {
        globalOnlineUsers.set(userId, new Set());
      }
      globalOnlineUsers.get(userId).add(socket.id);
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

    const handleJoin = async ({ roomId, username, inviteCode, hostToken, userId, sessionId, force, profile, emotionId }) => {
      // 1. Strict User ID validation
      const rawUserId = String(userId || "").trim();
      const requestUserId = (rawUserId && rawUserId !== "null" && rawUserId !== "undefined") ? rawUserId : null;
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
      }

      const cleanName = username?.trim() || `User-${socket.id.slice(0, 4)}`;
      const isOwner = requestUserId && room.ownerUserId && requestUserId === room.ownerUserId;
      const isAuthorizedHost = hostToken === room.hostToken || isOwner;
      
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
      if (requestUserId) userIdToRoomId.set(requestUserId, room.id);

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
      socket.emit("room:state", roomService.snapshot(room));
      io.to(room.id).emit("presence:update", room.users);
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
      if (!room || !authorized) return;

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

    socket.on("room:set_problem", ({ roomId, problemId, targetImage }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      const authorized = Boolean(room && ((user && user.role === "Host") || (user?.userId && room.ownerUserId && user.userId === room.ownerUserId)));
      console.log(`room:set_problem -> roomId: ${roomId}, problemId: ${problemId}, user: ${user?.name}, role: ${user?.role}, authorized: ${authorized}`);
      if (!room || !authorized) return;

      room.problemId = problemId;
      if (targetImage) {
        room.targetImage = targetImage;
      }
      roomRepository.save(room).catch((error) => console.warn(`Room persistence failed: ${error.message}`));
      io.to(roomId).emit("room:state", roomService.snapshot(room));
      broadcastRooms();
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
        if (!room || !user || user.role === "Viewer") return;
        const file = room.files.find((item) => item.name === fileName);
        if (!file) return;
        // Broadcast the update so users viewing other files receive the changes in the background
        socket.to(roomId).emit("file:update", { fileName, code });
      });

    socket.on("file:create", ({ roomId, fileName, language, code }) => {
      console.log(`[Socket] file:create requested by ${socket.id} for file ${fileName}`);
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      if (!room || !user || user.role === "Viewer" || !fileName?.trim()) {
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
      if (!room || !user || user.role === "Viewer") return;
      if (!roomService.removeFile(room, fileName)) return;
      roomRepository.save(room).catch((error) => console.warn(`Room persistence failed: ${error.message}`));
      io.to(roomId).emit("files:update", room.files);
    });

    socket.on("file:rename", ({ roomId, oldFileName, newFileName, language, code }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      if (!room || !user || user.role === "Viewer" || !oldFileName || !newFileName?.trim()) return;

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
      if (!room || !user || (!cleanText && !cleanStickerId)) return;
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
      if (!room || !user || user.role === "Viewer") return;
      user.mic = Boolean(mic);
      user.speaking = Boolean(speaking);
      io.to(roomId).emit("presence:update", room.users);
    });

    socket.on("voice:signal", ({ roomId, target, signal }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      if (!room || !user) return;
      socket.to(target).emit("voice:signal", { from: socket.id, signal, user: user.name });
    });
    
    socket.on("notes:update", ({ roomId, text }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      if (!room || !user || user.role === "Viewer") return;
      if (!room.notes) room.notes = { text: "", draws: [] };
      room.notes.text = text;
      roomRepository.save(room).catch(e => console.warn(`Room persistence failed: ${e.message}`));
      socket.to(roomId).emit("notes:update", room.notes);
    });

    socket.on("notes:draw", ({ roomId, draw }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      if (!room || !user || user.role === "Viewer") return;
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
      if (!room || !user || user.role === "Viewer") return;
      
      roomService.addToHistory(room, user);
      io.to(roomId).emit("history:update", (room.history || []).slice(-10));
    });

    socket.on("room:end", ({ roomId }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      const authorized = Boolean(room && (user?.role === "Host" || (user?.userId && room.ownerUserId && user.userId === room.ownerUserId)));
      if (!room || !authorized) return;

      console.log(`room:end - host closing room ${roomId}`);
      
      // Cleanup all authenticated users' room tracking before deleting
      if (room.users) {
        room.users.forEach(u => {
          if (u.userId) userIdToRoomId.delete(u.userId);
          socketUsers.delete(u.socketId);
        });
      }

      roomRepository.delete(roomId).catch((error) => console.warn(`Room deletion failed: ${error.message}`));
      io.to(roomId).emit("room:ended");
      broadcastRooms();
    });

    socket.on("disconnect", () => {
      if (socket.globalUserId && globalOnlineUsers.has(socket.globalUserId)) {
        const userSockets = globalOnlineUsers.get(socket.globalUserId);
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          globalOnlineUsers.delete(socket.globalUserId);
        }
      }

      const roomId = socketUsers.get(socket.id);
      const room = roomId && roomRepository.findById(roomId);
      socketUsers.delete(socket.id);
      if (!room) return;
      
      const disconnectingUser = room.users.find((user) => user.socketId === socket.id);
      if (disconnectingUser && disconnectingUser.userId) {
        userIdToRoomId.delete(disconnectingUser.userId);
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
