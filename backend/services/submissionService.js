import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createFirestore } from "../config/firebase.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultFilePath = path.join(__dirname, "../data/submissions.json");

async function readItems(filePath) {
  try {
    const parsed = JSON.parse(await fs.readFile(filePath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeItems(filePath, items) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(items, null, 2));
}

export class SubmissionService {
  constructor({ db = createFirestore(), filePath = defaultFilePath } = {}) {
    this.db = db;
    this.filePath = filePath;
  }

  async record(submission) {
    const item = {
      id: `submission-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: submission.userId || null,
      problemId: String(submission.problemId || ""),
      language: String(submission.language || ""),
      verdict: String(submission.verdict || "judge_error"),
      passed: Number(submission.passed) || 0,
      total: Number(submission.total) || 0,
      executionTime: Number(submission.executionTime) || 0,
      createdAt: Date.now()
    };

    if (this.db && !this.db.isMock) {
      await this.db.collection("submissions").doc(item.id).set(item);
      return item;
    }

    const items = await readItems(this.filePath);
    items.unshift(item);
    await writeItems(this.filePath, items.slice(0, 5_000));
    return item;
  }

  async list(limit = 500) {
    const safeLimit = Math.min(Math.max(Number(limit) || 500, 1), 1_000);
    if (this.db && !this.db.isMock) {
      const snapshot = await this.db.collection("submissions").orderBy("createdAt", "desc").limit(safeLimit).get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    const items = await readItems(this.filePath);
    return items.sort((a, b) => Number(b.createdAt) - Number(a.createdAt)).slice(0, safeLimit);
  }
}
