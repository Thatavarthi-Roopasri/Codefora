import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createFirestore } from '../config/firebase.js';
import { runtimeDataPath } from '../utils/runtimeDataPath.js';

// One document per target, draft or attempt avoids shared-user JSON rewrites.
export class ChallengeStore {
  constructor({ db, directory } = {}) { this.db = db; this.directory = directory; }
  database() { if (this.db === undefined) this.db = createFirestore(); return this.db?.isMock ? null : this.db; }
  folder(collection) { return path.join(this.directory || runtimeDataPath('challenge-work'), collection); }
  file(collection, id) { return path.join(this.folder(collection), `${crypto.createHash('sha256').update(String(id)).digest('hex')}.json`); }
  async get(collection, id) {
    const db = this.database();
    if (db) { const doc = await db.collection(collection).doc(id).get(); return doc.exists ? doc.data() : null; }
    try { return JSON.parse(await fs.readFile(this.file(collection, id), 'utf8')); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }
  async set(collection, id, value) {
    const db = this.database();
    if (db) { await db.collection(collection).doc(id).set(value); return; }
    await fs.mkdir(this.folder(collection), { recursive: true });
    const filename = this.file(collection, id), temporary = `${filename}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(value), 'utf8');
    await fs.rename(temporary, filename);
  }
  async list(collection, ownerId) {
    const db = this.database();
    if (db) { const snapshot = await db.collection(collection).where('ownerId', '==', ownerId).get(); return snapshot.docs.map(doc => doc.data()); }
    let names;
    try { names = await fs.readdir(this.folder(collection)); } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
    const values = await Promise.all(names.filter(name => name.endsWith('.json')).map(async name => JSON.parse(await fs.readFile(path.join(this.folder(collection), name), 'utf8'))));
    return values.filter(value => value.ownerId === ownerId);
  }
}
export const challengeStore = new ChallengeStore();

const locks = new Map();
export async function withChallengeLock(key, action) {
  const previous = locks.get(key) || Promise.resolve();
  const next = previous.catch(() => {}).then(action);
  locks.set(key, next);
  try { return await next; } finally { if (locks.get(key) === next) locks.delete(key); }
}

export function validateChallengeFiles(files) {
  if (!Array.isArray(files) || !files.length || files.length > 8) throw new Error('Provide between one and eight files.');
  const clean = files.map(file => ({ name: String(file.name || '').replace(/[\\/]/g, ''), language: String(file.language || ''), code: String(file.code || '') }));
  if (clean.some(file => !file.name) || Buffer.byteLength(JSON.stringify(clean), 'utf8') > 300000) throw new Error('Challenge files must fit within 300 KB.');
  return clean;
}
