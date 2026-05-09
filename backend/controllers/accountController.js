import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createFirestore } from "../config/firebase.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localAccountsPath = path.join(__dirname, "../data/manualUsers.json");

function cleanUsername(value) {
  return String(value || "").trim();
}

function userIdFor(username) {
  return `manual_${username.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "")}`;
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function publicUser(userId, username) {
  return { userId, username, displayName: username };
}

async function readLocalAccounts() {
  try {
    return JSON.parse(await fs.readFile(localAccountsPath, "utf8"));
  } catch {
    return {};
  }
}

async function writeLocalAccounts(accounts) {
  await fs.mkdir(path.dirname(localAccountsPath), { recursive: true });
  await fs.writeFile(localAccountsPath, JSON.stringify(accounts, null, 2));
}

export function createAccountController() {
  const db = createFirestore();

  async function getAccount(userId) {
    if (db) {
      const doc = await db.collection("users").doc(userId).get();
      return { exists: doc.exists, data: doc.data() || {}, ref: doc.ref };
    }

    const accounts = await readLocalAccounts();
    return { exists: Boolean(accounts[userId]), data: accounts[userId] || {}, accounts };
  }

  async function setAccount(userId, data, options = {}) {
    if (db) {
      await db.collection("users").doc(userId).set(data, options);
      return;
    }

    const accounts = await readLocalAccounts();
    accounts[userId] = options.merge
      ? { ...(accounts[userId] || {}), ...data, account: { ...((accounts[userId] || {}).account || {}), ...(data.account || {}) } }
      : data;
    await writeLocalAccounts(accounts);
  }

  return {
    signup: async (request, response) => {
      const username = cleanUsername(request.body?.username);
      const password = String(request.body?.password || "");
      const confirmPassword = String(request.body?.confirmPassword || "");

      if (!username) return response.status(400).json({ error: "Username is required" });
      if (password.length < 6) return response.status(400).json({ error: "Password must be at least 6 characters" });
      if (password !== confirmPassword) return response.status(400).json({ error: "Passwords do not match" });

      const userId = userIdFor(username);

      try {
        const existing = await getAccount(userId);
        if (existing.exists) return response.status(409).json({ error: "Username already exists" });

        await setAccount(userId, {
          account: {
            username,
            passwordHash: hashPassword(password),
            provider: "manual",
            createdAt: Date.now()
          },
          profile: {
            displayName: username
          },
          updatedAt: Date.now()
        });

        return response.status(201).json(publicUser(userId, username));
      } catch (error) {
        console.warn(`Manual signup failed: ${error.message}`);
        return response.status(500).json({ error: error.message });
      }
    },

    login: async (request, response) => {
      const username = cleanUsername(request.body?.username);
      const password = String(request.body?.password || "");

      if (!username || !password) return response.status(400).json({ error: "Username and password are required" });

      // Special Admin Account: cf_master
      if (username === "cf_master" && password === "Codefora@X99") {
        const userId = "admin_cf_master";
        // Simple token for demonstration (In production, use JWT)
        const token = crypto.createHash("sha256").update(`${userId}_ADMIN_SECRET_${Date.now()}`).digest("hex");
        
        return response.json({
          userId,
          username,
          displayName: "Admin Master",
          role: "admin",
          token,
          photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=admin"
        });
      }

      try {
        const userId = userIdFor(username);
        const doc = await getAccount(userId);
        if (!doc.exists) return response.status(401).json({ error: "Invalid username or password" });

        const account = doc.data?.account || {};
        if (account.passwordHash !== hashPassword(password)) {
          return response.status(401).json({ error: "Invalid username or password" });
        }

        await setAccount(userId, { account: { lastLoginAt: Date.now() }, updatedAt: Date.now() }, { merge: true });
        
        // Return user with default 'user' role
        return response.json({
          ...publicUser(userId, account.username || username),
          role: "user"
        });
      } catch (error) {
        console.warn(`Manual login failed: ${error.message}`);
        return response.status(500).json({ error: error.message });
      }
    }
  };
}
