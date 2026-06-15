import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createAuth, createFirestore } from "../config/firebase.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localProblemsPath = path.join(__dirname, "../data/problems.json");

async function readJSON(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeJSON(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export function createAdminController(roomRepository) {
  const auth = createAuth();
  const db = createFirestore();

  return {
    getStats: async (request, response) => {
      try {
        const problems = await readJSON(localProblemsPath);
        const rooms = roomRepository.listAll();
        
        let totalUsers = 0;
        if (auth) {
          // For small user bases, we can list all to get count.
          // For larger ones, we'd use a metadata counter or loop through pages.
          const listUsersResult = await auth.listUsers(1000);
          totalUsers = listUsersResult.users.length;
        }

        // Calculate online users (users in rooms)
        const onlineUserIds = new Set();
        rooms.forEach(r => (r.users || []).forEach(u => onlineUserIds.add(u.userId || u.socketId)));

        return response.json({
          totalUsers,
          onlineUsers: onlineUserIds.size,
          activeRooms: rooms.length,
          totalProblems: problems.length,
          mostSolved: "N/A"
        });
      } catch (err) {
        console.error("Admin stats failed:", err);
        return response.status(500).json({ error: err.message });
      }
    },

    getRooms: async (request, response) => {
      const rooms = roomRepository.listAll().map(r => ({
        id: r.id,
        name: r.name,
        host: r.hostName || "Unknown",
        users: `${(r.users || []).length}/${r.maxMembers || 10}`,
        created: new Date(r.createdAt || Date.now()).toLocaleString(),
        isLocked: r.isLocked || false,
        visibility: r.visibility
      }));
      return response.json(rooms);
    },

    getUsers: async (request, response) => {
      try {
        if (!auth) return response.json([]);

        const listUsersResult = await auth.listUsers(1000);
        const authUsers = listUsersResult.users;

        // Fetch profiles from Firestore to get more info (like rating, solved count, etc)
        const profilesMap = {};
        if (db && !db.isMock) {
          const profilesSnap = await db.collection("profiles").get();
          profilesSnap.forEach(doc => {
            profilesMap[doc.id] = doc.data();
          });
        }

        const users = authUsers.map(user => {
          const profile = profilesMap[user.uid] || {};
          return {
            userId: user.uid,
            name: user.displayName || profile.name || user.email?.split('@')[0] || "Unknown User",
            email: user.email,
            emotionId: profile.emotionId || "",
            photoURL: user.photoURL || profile.photoURL || "",
            rating: profile.rating || 1500,
            solved: profile.solvedCount || 0,
            status: "Offline", // Real-time status would require more logic
            role: profile.role || "user",
            createdAt: user.metadata.creationTime
          };
        });

        users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return response.json(users);
      } catch (err) {
        console.error("Admin list users failed:", err);
        return response.status(500).json({ error: err.message });
      }
    },

    getProblems: async (request, response) => {
      const problems = await readJSON(localProblemsPath);
      return response.json(problems);
    },

    deleteRoom: async (request, response) => {
      const { id } = request.params;
      await roomRepository.delete(id);
      return response.json({ success: true });
    },

    toggleRoomLock: async (request, response) => {
      const { id } = request.params;
      const room = roomRepository.findById(id);
      if (!room) return response.status(404).json({ error: "Room not found" });
      
      room.isLocked = !room.isLocked;
      await roomRepository.save(room);
      return response.json({ success: true, isLocked: room.isLocked });
    },

    publishProblem: async (request, response) => {
      const { id } = request.params;
      const problems = await readJSON(localProblemsPath);
      const problem = problems.find(p => p.id === id);
      if (!problem) return response.status(404).json({ error: "Problem not found" });
      
      problem.published = !problem.published;
      await writeJSON(localProblemsPath, problems);
      return response.json({ success: true, published: problem.published });
    },

    deleteProblem: async (request, response) => {
      const { id } = request.params;
      const problems = await readJSON(localProblemsPath);
      const filtered = problems.filter(p => p.id !== id);
      await writeJSON(localProblemsPath, filtered);
      return response.json({ success: true });
    },

    addProblem: async (request, response) => {
      const problem = request.body;
      if (!problem.id || !problem.title) return response.status(400).json({ error: "ID and Title are required" });
      
      const problems = await readJSON(localProblemsPath);
      problems.push({ ...problem, published: false });
      await writeJSON(localProblemsPath, problems);
      return response.status(201).json({ success: true });
    },

    updateProblem: async (request, response) => {
      const { id } = request.params;
      const updates = request.body;
      const problems = await readJSON(localProblemsPath);
      const index = problems.findIndex(p => p.id === id);
      if (index === -1) return response.status(404).json({ error: "Problem not found" });
      
      problems[index] = { ...problems[index], ...updates };
      await writeJSON(localProblemsPath, problems);
      return response.json({ success: true });
    }
  };
}
