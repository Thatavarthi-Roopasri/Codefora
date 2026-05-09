import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localUsersPath = path.join(__dirname, "../data/manualUsers.json");
const localProblemsPath = path.join(__dirname, "../data/problems.json");

async function readJSON(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return Array.isArray(JSON.parse("{}")) ? [] : {};
  }
}

async function writeJSON(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export function createAdminController(roomRepository) {
  return {
    getStats: async (request, response) => {
      const users = await readJSON(localUsersPath);
      const problems = await readJSON(localProblemsPath);
      const rooms = roomRepository.listAll();
      
      const totalUsers = Object.keys(users).length;
      const activeRooms = rooms.length;
      const totalProblems = problems.length;
      
      // Calculate online users (users in rooms)
      const onlineUserIds = new Set();
      rooms.forEach(r => (r.users || []).forEach(u => onlineUserIds.add(u.userId || u.socketId)));

      return response.json({
        totalUsers,
        onlineUsers: onlineUserIds.size,
        activeRooms,
        totalProblems,
        mostSolved: "Two Sum" // Placeholder for now
      });
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
      const accounts = await readJSON(localUsersPath);
      const users = Object.entries(accounts).map(([id, data]) => {
        let name = data.profile?.displayName || data.account?.username;
        let isGoogle = id.length > 20 && !id.startsWith("manual_");
        
        if (!name) {
          name = isGoogle ? "Google User" : "Unknown User";
        }

        return {
          userId: id,
          name: name,
          emotionId: data.profile?.emotionId || "",
          photoURL: data.profile?.photoURL || "",
          rating: 1500, // Placeholder
          solved: 0, // Placeholder
          rooms: 0, // Placeholder
          status: "Offline", // Placeholder
          role: data.account?.role || "user"
        };
      });
      return response.json(users);
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
