import { createFirestore } from "../config/firebase.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localRoomsPath = path.join(__dirname, "../data/rooms.json");

export class RoomRepository {
  constructor(seedRooms) {
    this.firestore = createFirestore();
    this.rooms = new Map(seedRooms.map((room) => [room.id, room]));
  }

  markActive(id) {
    const room = this.rooms.get(id);
    if (room) room.lastActivityAt = Date.now();
  }

  cleanupZombieRooms() {
    const now = Date.now();
    const zombieRooms = [];
    for (const [id, room] of this.rooms.entries()) {
      if (room.users && room.users.length === 0) {
        if (now - (room.lastActivityAt || room.updatedAt || room.createdAt || now) > 5 * 60 * 1000) {
          zombieRooms.push(id);
        }
      }
    }
    for (const id of zombieRooms) {
      console.log(`[Zombie Cleanup] Deleting idle room ${id}`);
      this.delete(id).catch(err => console.error(`Failed to delete room ${id}`, err));
    }
    return zombieRooms;
  }

  async load() {
    if (!this.firestore) {
      const localRooms = await this.readLocalRooms();
      if (localRooms.length) {
        this.rooms = new Map(localRooms.map((room) => [room.id, { ...room, users: [] }]));
      }
      return;
    }
    const snapshot = await this.firestore.collection("rooms").orderBy("createdAt", "desc").limit(30).get();
    if (!snapshot.empty) {
      const inviteCodeUpdates = [];
      this.rooms = new Map(snapshot.docs.map((doc) => {
        const data = doc.data();
        // Ensure legacy rooms have an invite code
        if (!data.inviteCode) {
          data.inviteCode = (doc.id.slice(0, 4) + Math.random().toString(36).slice(2, 6)).toUpperCase();
          inviteCodeUpdates.push(
            this.firestore.collection("rooms").doc(doc.id).set({ inviteCode: data.inviteCode }, { merge: true }),
          );
        }
        return [doc.id, { id: doc.id, ...data, users: [] }];
      }));
      if (inviteCodeUpdates.length) {
        await Promise.all(inviteCodeUpdates);
      }
    }
  }

  listPublic() {
    return [...this.rooms.values()].filter((room) => room.visibility === "public");
  }

  listAll() {
    return [...this.rooms.values()];
  }

  allPublicSummaries(summary) {
    return this.listPublic().map(summary);
  }

  findById(id) {
    return this.rooms.get(String(id || "").trim());
  }

  findByName(name) {
    const clean = String(name || "").trim().toLowerCase();
    return [...this.rooms.values()].find((room) => String(room.name || "").trim().toLowerCase() === clean);
  }

  findByInviteCode(inviteCode) {
    const normalized = normalizeInvite(inviteCode);
    if (!normalized) return undefined;
    return [...this.rooms.values()].find((room) => normalizeInvite(room.inviteCode) === normalized);
  }

  async fetchById(id) {
    const memRoom = this.findById(id);
    if (memRoom) return memRoom;
    if (!this.firestore) return undefined;
    const doc = await this.firestore.collection("rooms").doc(String(id || "").trim()).get();
    if (doc.exists) {
      const data = doc.data();
      const room = { id: doc.id, ...data, users: [] };
      this.rooms.set(room.id, room);
      return room;
    }
    return undefined;
  }

  async fetchByInviteCode(inviteCode) {
    const normalized = normalizeInvite(inviteCode);
    if (!normalized) return undefined;
    const memRoom = this.findByInviteCode(inviteCode);
    if (memRoom) return memRoom;
    if (!this.firestore) return undefined;
    const snapshot = await this.firestore.collection("rooms").where("inviteCode", "==", normalized).limit(1).get();
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      const room = { id: doc.id, ...data, users: [] };
      this.rooms.set(room.id, room);
      return room;
    }
    return undefined;
  }

  async save(room) {
    let trimmedName = room.name?.trim() || "Untitled Lab";
    const duplicate = this.findByName(trimmedName);
    if (duplicate && duplicate.id !== room.id) {
      throw new Error("Room name is already taken.");
    }
    room.name = trimmedName;
    room.updatedAt = Date.now();

    this.rooms.set(room.id, room);
    const { users, ...persisted } = room;
    if (!this.firestore) {
      await this.writeLocalRooms();
      return;
    }
    await this.firestore.collection("rooms").doc(room.id).set(persisted, { merge: true });
  }

  async delete(id) {
    this.rooms.delete(id);
    if (!this.firestore) {
      await this.writeLocalRooms();
      return;
    }
    await this.firestore.collection("rooms").doc(id).delete();
  }

  async readLocalRooms() {
    try {
      const payload = JSON.parse(await fs.readFile(localRoomsPath, "utf8"));
      return Array.isArray(payload) ? payload : [];
    } catch {
      return [];
    }
  }

  async writeLocalRooms() {
    const rooms = [...this.rooms.values()].map((room) => {
      const { users, ...persisted } = room;
      return persisted;
    });
    await fs.mkdir(path.dirname(localRoomsPath), { recursive: true });
    await fs.writeFile(localRoomsPath, JSON.stringify(rooms, null, 2));
  }
}

function normalizeInvite(inviteCode) {
  return String(inviteCode || "").replace(/\s+/g, "").trim().toUpperCase();
}
