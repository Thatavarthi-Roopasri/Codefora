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
      hostName: username?.trim() || "Host",
      ownerUserId: userId?.trim() || null,
      hostToken: cryptoId() + cryptoId(),
      inviteCode,
      problemId: problemId || null,
      max: Math.min(Number(max) || 5, 5),
      createdAt: Date.now()
    };
  }

  publicRoom(room) {
    return {
      id: room.id,
      name: room.name,
      visibility: room.visibility,
      users: room.users.length,
      max: room.max || 6,
      hostName: room.hostName || "Host",
      status: room.users.length > 0 ? "active" : "idle",
      usersList: (room.users || []).slice(0, 6),
      lang: room.files.find((file) => file.name.endsWith(".js"))?.language || "mixed",
      problemId: room.problemId || null
    };
  }

  snapshot(room) {
    return {
      ...this.publicRoom(room),
      files: room.files,
      messages: room.messages.slice(-50),
      usersList: room.users
    };
  }

  findUser(room, socketId) {
    return room.users.find((user) => user.socketId === socketId);
  }

  addFile(room, fileName, language) {
    const cleanName = fileName.trim().replace(/[\\/]/g, "");
    if (!cleanName || room.files.some((file) => file.name === cleanName) || room.files.length >= 8) return false;
    room.files.push({ name: cleanName, language: String(language || "").trim() || languageFromName(cleanName), code: starterCode(cleanName) });
    return true;
  }

  removeFile(room, fileName) {
    if (room.files.length <= 1) return false;
    room.files = room.files.filter((file) => file.name !== fileName);
    return true;
  }
}
