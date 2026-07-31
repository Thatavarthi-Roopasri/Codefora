import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createAuth, createFirestore } from "../config/firebase.js";
import { globalOnlineUsers } from "../utils/presenceTracker.js";
import { getNextFriendCode } from "./profileController.js";

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

        return response.json({
          totalUsers,
          onlineUsers: globalOnlineUsers.size,
          activeRooms: rooms.length,
          totalProblems: problems.length,
          mostSolved: "N/A",
          isSuperAdmin: request.adminUser?.isSuperAdmin || false
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

        const users = [];
        const maxUsersToFetch = 1000;
        const listUsersResult = await auth.listUsers(maxUsersToFetch); 
        const authUsers = listUsersResult.users;

        // Fetch profiles from Firestore 
        const profilesMap = {};
        if (db) {
          // Fetch up to 1000 recent profiles to match Auth limits without memory leaking
          const profilesSnap = await db.collection("users").orderBy("updatedAt", "desc").limit(maxUsersToFetch).get();
          profilesSnap.forEach(doc => {
            profilesMap[doc.id] = doc.data().profile || {};
          });
        }

        const usersList = [];
        for (const user of authUsers) {
          let profile = profilesMap[user.uid] || {};
          
          usersList.push({
            userId: user.uid,
            friendCode: profile.friendCode || "",
            name: user.displayName || profile.displayName || user.email?.split('@')[0] || "Unknown User",
            email: user.email,
            emotionId: profile.emotionId || "",
            photoURL: user.photoURL || profile.photoURL || "",
            rating: profile.rating || 1500,
            solved: profile.solvedCount || 0,
            status: globalOnlineUsers.has(user.uid) ? "Online" : "Offline",
            role: profile.role || "user",
            createdAt: user.metadata.creationTime,
            lastActive: user.metadata.lastSignInTime || user.metadata.creationTime
          });
        }
        
        usersList.sort((a, b) => {
          if (a.status === "Online" && b.status !== "Online") return -1;
          if (b.status === "Online" && a.status !== "Online") return 1;
          return new Date(b.lastActive || 0) - new Date(a.lastActive || 0);
        });
        return response.json(usersList);
      } catch (err) {
        console.error("Admin list users failed:", err);
        return response.status(500).json({ error: err.message });
      }
    },

    updateUserRole: async (request, response) => {
      try {
        if (!request.adminUser?.isSuperAdmin) {
          return response.status(403).json({ error: "Only Super Admins can manage roles." });
        }
        
        const { id } = request.params;
        const { role } = request.body;
        
        if (!db || db.isMock) return response.status(500).json({ error: "Database not available" });
        
        const userRef = db.collection("users").doc(id);
        const userDoc = await userRef.get();
        
        let profile = userDoc.exists ? userDoc.data().profile || {} : {};
        profile.role = role;
        
        await userRef.set({ profile }, { merge: true });
        
        return response.json({ success: true, role });
      } catch (err) {
        console.error("Admin updateUserRole failed:", err);
        return response.status(500).json({ error: err.message });
      }
    },

    getProblems: async (request, response) => {
      const problems = await readJSON(localProblemsPath);
      return response.json(problems);
    },

    deleteRoom: async (request, response) => {
      try {
        const { id } = request.params;
        await roomRepository.delete(id);
        return response.json({ success: true });
      } catch (err) {
        return response.status(500).json({ error: err.message });
      }
    },

    deleteProblem: async (request, response) => {
      try {
        const { id } = request.params;
        const problems = await readJSON(localProblemsPath);
        const filtered = problems.filter(p => p.id !== id);
        await writeJSON(localProblemsPath, filtered);
        return response.json({ success: true });
      } catch (err) {
        return response.status(500).json({ error: err.message });
      }
    },

    toggleRoomLock: async (request, response) => {
      try {
        const { id } = request.params;
        const room = roomRepository.findById(id);
        if (!room) return response.status(404).json({ error: "Room not found" });
        
        room.isLocked = !room.isLocked;
        await roomRepository.save(room);
        return response.json({ success: true, isLocked: room.isLocked });
      } catch (err) {
        return response.status(500).json({ error: err.message });
      }
    },

    publishProblem: async (request, response) => {
      try {
        const { id } = request.params;
        const problems = await readJSON(localProblemsPath);
        const problem = problems.find(p => p.id === id);
        if (!problem) return response.status(404).json({ error: "Problem not found" });
        
        problem.published = !problem.published;
        await writeJSON(localProblemsPath, problems);
        return response.json({ success: true, published: problem.published });
      } catch (err) {
        return response.status(500).json({ error: err.message });
      }
    },

    addProblem: async (request, response) => {
      try {
        const problem = request.body;
        if (!problem.id || !problem.title) return response.status(400).json({ error: "ID and Title are required" });
        
        const problems = await readJSON(localProblemsPath);
        problems.push({ ...problem, published: false });
        await writeJSON(localProblemsPath, problems);
        return response.status(201).json({ success: true });
      } catch (err) {
        return response.status(500).json({ error: err.message });
      }
    },

    updateProblem: async (request, response) => {
      try {
        const { id } = request.params;
        const updates = request.body;
        const problems = await readJSON(localProblemsPath);
        const index = problems.findIndex(p => p.id === id);
        if (index === -1) return response.status(404).json({ error: "Problem not found" });
        
        problems[index] = { ...problems[index], ...updates };
        await writeJSON(localProblemsPath, problems);
        return response.json({ success: true });
      } catch (err) {
        return response.status(500).json({ error: err.message });
      }
    }
  };
}
