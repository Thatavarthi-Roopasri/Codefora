import { cryptoId } from "../utils/id.js";

export function registerCollaborationSocket(io, { roomRepository, roomService }) {
  const socketUsers = new Map();
  const userIdToRoomId = new Map(); // Track authenticated userId -> roomId to prevent multi-room access
  const broadcastRooms = () => io.emit("rooms:update", roomRepository.allPublicSummaries((room) => roomService.publicRoom(room)));

  io.on("connection", (socket) => {
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
      console.log(`[Socket] Join request from ${username} (ID: ${userId}) with emotion: ${emotionId || profile?.emotionId}`);
      const requestUserId = (userId && String(userId).trim()) || null;
      const requestSessionId = (sessionId && String(sessionId).trim()) || null;
      const cleanInviteCode = normalizeInvite(inviteCode);
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

      // 1. Session Takeover for Refresh (Same Tab)
      // If we see the exact same sessionId in the same room, it's a refresh.
      const existingSession = room.users.find(u => u.sessionId === requestSessionId && u.socketId !== socket.id);
      if (existingSession) {
        console.log(`[Refresh Detect] User ${requestUserId} refreshed tab. Disconnecting old socket ${existingSession.socketId}`);
        const oldSocket = io.sockets.sockets.get(existingSession.socketId);
        if (oldSocket) oldSocket.disconnect(true);
        room.users = room.users.filter(u => u.socketId !== existingSession.socketId);
        socketUsers.delete(existingSession.socketId);
      }

      // 2. Multi-room / Multi-tab Protection (Different Tab/Room)
      if (requestUserId && userIdToRoomId.has(requestUserId)) {
        const existingRoomId = userIdToRoomId.get(requestUserId);
        
        // If it's a different room OR a different tab (session), block unless forced
        if (!force && (existingRoomId !== room.id || (requestSessionId && !existingSession))) {
          console.warn(`[Multi-Tab Block] User ${requestUserId} already active in ${existingRoomId}`);
          socket.emit("room:error", "You are already active in another room or tab.");
          socket.emit("room:join:failed", { reason: "already_in_room", roomId, existingRoomId });
          return;
        }

        // Takeover previous tab/room if forced
        if (force) {
          const oldRoom = roomRepository.findById(existingRoomId);
          if (oldRoom) {
            const oldUser = oldRoom.users.find(u => u.userId === requestUserId && u.socketId !== socket.id);
            if (oldUser) {
              const oldSocket = io.sockets.sockets.get(oldUser.socketId);
              if (oldSocket) oldSocket.disconnect(true);
              oldRoom.users = oldRoom.users.filter(u => u.socketId !== oldUser.socketId);
              io.to(existingRoomId).emit("presence:update", oldRoom.users);
              socketUsers.delete(oldUser.socketId);
            }
          }
        }

        userIdToRoomId.delete(requestUserId);
      }

      const cleanName = username?.trim() || `User-${socket.id.slice(0, 4)}`;
      const isOwner = requestUserId && room.ownerUserId && requestUserId === room.ownerUserId;
      const isHost = hostToken === room.hostToken || isOwner || (room.users.length === 0 && cleanName === room.hostName);
      const role = isHost ? "Host" : room.visibility === "public" ? "Viewer" : "Member";
      
      const user = {
        socketId: socket.id,
        name: profile?.displayName || cleanName,
        role,
        mic: false,
        speaking: false,
        color: role === "Host" ? "#FF7A18" : role === "Member" ? "#8BE9FD" : "#50FA7B",
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
      // Track authenticated userId to prevent multi-room access
      if (requestUserId) userIdToRoomId.set(requestUserId, room.id);
      const reconnectingHost = isHost || hostToken === room.hostToken || isOwner;
      if (reconnectingHost) {
        const currentHost = room.users.find(u => u.role === "Host" && u.socketId !== socket.id);
        if (currentHost && (!requestUserId || currentHost.userId !== requestUserId)) {
          currentHost.role = "Member";
          currentHost.color = "#8BE9FD";
        }
      }
      room.users = room.users.filter((existing) => {
        if (existing.socketId === socket.id) return false;
        if (requestUserId && existing.userId === requestUserId) return false;
        return true;
      });
      room.users.push(user);
      socket.emit("room:state", roomService.snapshot(room));
      socket.to(room.id).emit("presence:update", room.users);
      broadcastRooms();
    };

    socket.on("room:join", (data) => handleJoin(data));
    socket.on("room:join:force", (data) => handleJoin({ ...data, force: true }));


    socket.on("role:update", ({ roomId, targetSocketId, role }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      const target = room && roomService.findUser(room, targetSocketId);
      if (!room || !user || !target || user.role !== "Host" || target.socketId === user.socketId) return;
      if (role === "Host") {
        user.role = "Member";
        user.color = "#8BE9FD";
        target.role = "Host";
        target.color = "#FF7A18";
        target.mic = Boolean(target.mic);
        target.speaking = Boolean(target.speaking);
        room.hostName = target.name;
        io.to(target.socketId).emit("host:token", { roomId, hostToken: room.hostToken });
      } else {
        if (target.role === "Host") return;
        target.role = role === "Member" ? "Member" : "Viewer";
        target.color = target.role === "Member" ? "#8BE9FD" : "#50FA7B";
      }
      if (target.role === "Viewer") {
        target.mic = false;
        target.speaking = false;
      }
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
      file.code = code;
      roomRepository.save(room).catch((error) => console.warn(`Room persistence failed: ${error.message}`));
      socket.to(roomId).emit("file:update", { fileName, code, user: user.name });
    });

    socket.on("file:create", ({ roomId, fileName, language }) => {
      const room = roomRepository.findById(roomId);
      const user = room && roomService.findUser(room, socket.id);
      if (!room || !user || user.role === "Viewer" || !fileName?.trim()) return;
      if (!roomService.addFile(room, fileName, language)) return;
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
      if (!room || !user || user.role === "Viewer") return;
      socket.to(target).emit("voice:signal", { from: socket.id, signal, user: user.name });
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
      const roomId = socketUsers.get(socket.id);
      const room = roomId && roomRepository.findById(roomId);
      socketUsers.delete(socket.id);
      if (!room) return;
      const disconnectingUser = room.users.find((user) => user.socketId === socket.id);
      // Remove authenticated user from multi-room tracking
      if (disconnectingUser && disconnectingUser.userId) {
        userIdToRoomId.delete(disconnectingUser.userId);
      }
      
      room.users = room.users.filter((user) => user.socketId !== socket.id);
      
      if (disconnectingUser?.role === "Host" && room.users.length > 0) {
        const oldest = [...room.users].sort((a,b) => a.joinedAt - b.joinedAt)[0];
        oldest.role = "Host";
        oldest.color = "#FF7A18";
        room.hostName = oldest.name;
        console.log(`[Host Disconnect] Transferred host of ${roomId} to ${oldest.name}`);
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
