import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createFirestore } from "../config/firebase.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localFeedbackPath = path.join(__dirname, "../data/feedback.json");

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
          type: type || "general",
          createdAt: Date.now()
        };

        // Always save to local file (primary storage)
        const allFeedback = await readJSON(localFeedbackPath);
        allFeedback.push(feedback);
        await writeJSON(localFeedbackPath, allFeedback);

        // Also save to Firestore if available (backup)
        if (db) {
          try {
            await db.collection("feedback").doc(feedback.id).set(feedback);
          } catch (fbErr) {
            console.warn("Firestore feedback backup failed:", fbErr.message);
          }
        }

        return response.json({ success: true });
      } catch (error) {
        console.error("Feedback submission failed:", error);
        return response.status(500).json({ error: error.message });
      }
    },

    getAll: async (request, response) => {
      try {
        // Always read from local file (primary)
        const allFeedback = await readJSON(localFeedbackPath);
        return response.json(allFeedback.sort((a, b) => b.createdAt - a.createdAt));
      } catch (error) {
        console.error("Fetching feedback failed:", error);
        return response.status(500).json({ error: error.message });
      }
    }
  };
}
