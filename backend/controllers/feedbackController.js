import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createFirestore } from "../config/firebase.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localFeedbackPath = path.join(__dirname, "../data/feedback.json");

async function readJSON(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return [];
  }
}

async function writeJSON(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export function createFeedbackController() {
  const db = createFirestore();

  return {
    submit: async (request, response) => {
      try {
        const { username, rating, message, type } = request.body;
        const feedback = {
          id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          username: username || "Anonymous",
          rating: Number(rating) || 0,
          message: message || "",
          type: type || "general", // 'general', 'room_leave', 'problem_solve'
          createdAt: Date.now()
        };

        if (!db) {
          const allFeedback = await readJSON(localFeedbackPath);
          allFeedback.push(feedback);
          await writeJSON(localFeedbackPath, allFeedback);
          return response.json({ success: true });
        }

        await db.collection("feedback").doc(feedback.id).set(feedback);
        return response.json({ success: true });
      } catch (error) {
        console.error("Feedback submission failed:", error);
        return response.status(500).json({ error: error.message });
      }
    },

    getAll: async (request, response) => {
      try {
        if (!db) {
          const allFeedback = await readJSON(localFeedbackPath);
          return response.json(allFeedback.sort((a, b) => b.createdAt - a.createdAt));
        }

        const snapshot = await db.collection("feedback").orderBy("createdAt", "desc").get();
        const feedback = [];
        snapshot.forEach(doc => feedback.push(doc.data()));
        return response.json(feedback);
      } catch (error) {
        console.error("Fetching feedback failed:", error);
        return response.status(500).json({ error: error.message });
      }
    }
  };
}
