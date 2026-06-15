import { defaultFiles } from "../data/defaultFiles.js";
import { languageFromName, starterCode } from "../utils/files.js";
import { cryptoId, slugify } from "../utils/id.js";

export class RoomService {
  constructor(repository) {
    this.repository = repository;
  }

  createRoom({ name, username, visibility, userId, problemId, max }) {
    const trimmedName = name?.trim() || "Untitled Lab";

    if (this.repository.findByName(trimmedName)) {
      throw new Error("Room name is already taken.");
    }

    // Create compact, shareable ID like CF-X82P and ensure uniqueness
    const makeId = () => `CF-${cryptoId().slice(0, 4).toUpperCase()}`;
    let id = makeId();
    while (this.repository.findById(id)) id = makeId();

    // Enforce unique invite code
    let inviteCode = cryptoId().slice(0, 8).toUpperCase();
    while (this.repository.findByInviteCode(inviteCode)) {
      inviteCode = cryptoId().slice(0, 8).toUpperCase();
    }

    return {
      id,
      name: trimmedName,
      visibility: visibility === "private" ? "private" : "public",
      files: structuredClone(defaultFiles),
      messages: [],
      users: [],
      notes: { text: "", draws: [] },
      timer: { endTime: null, duration: 25 * 60, isRunning: false },
      history: [],
      hostName: username?.trim() || "Host",
      ownerUserId: userId?.trim() || null,
      hostToken: cryptoId() + cryptoId(),
      inviteCode,
      problemId: problemId || null,
      max: Math.min(Number(max) || 7, 7),
      createdAt: Date.now()
    };
  }

  publicRoom(room) {
    return {
      id: room.id,
      name: room.name,
      visibility: room.visibility,
      users: room.users.length,
      max: room.max || 7,
      hostName: room.hostName || "Host",
      status: room.users.length > 0 ? "active" : "idle",
      usersList: (room.users || []).slice(0, 6),
      lang: room.files.find((file) => file.name.endsWith(".js"))?.language || "mixed",
      problemId: room.problemId || null,
      createdAt: room.createdAt || Date.now()
    };
  }

  snapshot(room) {
    return {
      ...this.publicRoom(room),
      allowAi: room.allowAi !== false,
      allowCopyPaste: room.allowCopyPaste !== false,
      inviteCode: room.inviteCode,
      files: room.files,
      messages: room.messages.slice(-50),
      usersList: room.users,
      notes: room.notes || { text: "", draws: [] },
      timer: room.timer || { endTime: null, duration: 25 * 60, isRunning: false },
      history: (room.history || []).slice(-10) // Only send recent 10 major snapshots
    };
  }

  addToHistory(room, user) {
    // Only add if code changed significantly from last snapshot
    const lastSnapshot = room.history[room.history.length - 1];
    const currentFiles = room.files.map(f => ({ name: f.name, code: f.code }));
    
    if (!lastSnapshot || JSON.stringify(lastSnapshot.files) !== JSON.stringify(currentFiles)) {
      room.history.push({
        timestamp: Date.now(),
        user: user.name,
        files: structuredClone(currentFiles)
      });
      if (room.history.length > 50) room.history.shift(); // Keep last 50
    }
  }

  findUser(room, socketId) {
    return room.users.find((user) => user.socketId === socketId);
  }

  addFile(room, fileName, language, code) {
    const cleanName = fileName.trim().replace(/[\\/]/g, "");
    if (!cleanName || room.files.some((file) => file.name === cleanName) || room.files.length >= 8) {
      console.log(`[RoomService] addFile REJECTED: cleanName='${cleanName}', exists=${room.files.some((file) => file.name === cleanName)}, length=${room.files.length}`);
      return false;
    }
    room.files.push({ 
      name: cleanName, 
      language: String(language || "").trim() || languageFromName(cleanName), 
      code: code ?? starterCode(cleanName) 
    });
    return true;
  }

  removeFile(room, fileName) {
    if (room.files.length <= 1) return false;
    room.files = room.files.filter((file) => file.name !== fileName);
    return true;
  }
}
