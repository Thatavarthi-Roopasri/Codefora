import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createFirestore } from "../config/firebase.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultFilePath = path.join(__dirname, "../data/adminAudit.json");

async function readEntries(filePath) {
  try {
    const parsed = JSON.parse(await fs.readFile(filePath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeEntries(filePath, entries) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(entries, null, 2));
}

export class AdminAuditService {
  constructor({ db = createFirestore(), filePath = defaultFilePath } = {}) {
    this.db = db;
    this.filePath = filePath;
  }

  async record({ actor, action, target = "", details = "" }) {
    const entry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      actorId: actor?.uid || actor?.userId || "system",
      actorEmail: actor?.email || "system",
      action: String(action || "admin.action"),
      target: String(target || ""),
      details: String(details || ""),
      createdAt: Date.now()
    };

    if (this.db && !this.db.isMock) {
      await this.db.collection("adminAudit").doc(entry.id).set(entry);
      return entry;
    }

    const entries = await readEntries(this.filePath);
    entries.unshift(entry);
    await writeEntries(this.filePath, entries.slice(0, 2_000));
    return entry;
  }

  async list(limit = 200) {
    const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 500);
    if (this.db && !this.db.isMock) {
      const snapshot = await this.db.collection("adminAudit").orderBy("createdAt", "desc").limit(safeLimit).get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    const entries = await readEntries(this.filePath);
    return entries.sort((a, b) => Number(b.createdAt) - Number(a.createdAt)).slice(0, safeLimit);
  }
}
