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

export function createFeedbackController({ auditService } = {}) {
  const db = createFirestore();

  if (db) {
    console.log("✓ Feedback controller using Firestore (persistent)");
  } else {
    console.warn("⚠ Feedback controller using local file (will reset on deploy)");
  }

  return {
    submit: async (request, response) => {
      try {
        const { username, rating, message, type, reportedId, reportedName, reporterId, reporterName } = request.body;
        const feedback = {
          id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          username: username || "Anonymous",
          rating: Number(rating) || 0,
          message: message || "",
          type: type || "general",
          reportedId: reportedId || null,
          reportedName: reportedName || null,
          reporterId: reporterId || null,
          reporterName: reporterName || null,
          status: "open",
          createdAt: Date.now()
        };

        // Save to Firestore (primary — survives deploys)
        if (db) {
          await db.collection("feedback").doc(feedback.id).set(feedback);
          console.log(`✓ Feedback saved to Firestore: ${feedback.id}`);
        }

        // Also save to local file (backup)
        try {
          const allFeedback = await readJSON(localFeedbackPath);
          allFeedback.push(feedback);
          await writeJSON(localFeedbackPath, allFeedback);
        } catch (localErr) {
          console.warn("Local feedback backup failed:", localErr.message);
        }

        return response.json({ success: true });
      } catch (error) {
        console.error("Feedback submission failed:", error);
        return response.status(500).json({ error: error.message });
      }
    },

    getAll: async (request, response) => {
      try {
        // Try Firestore first (primary — persistent)
        if (db) {
          const snapshot = await db.collection("feedback").orderBy("createdAt", "desc").get();
          const feedback = [];
          snapshot.forEach(doc => feedback.push(doc.data()));
          console.log(`✓ Loaded ${feedback.length} feedback entries from Firestore`);
          return response.json(feedback);
        }

        // Fallback to local file
        const allFeedback = await readJSON(localFeedbackPath);
        return response.json(allFeedback.sort((a, b) => b.createdAt - a.createdAt));
      } catch (error) {
        console.error("Fetching feedback failed:", error);
        // If Firestore fails, try local file as last resort
        try {
          const allFeedback = await readJSON(localFeedbackPath);
          return response.json(allFeedback.sort((a, b) => b.createdAt - a.createdAt));
        } catch {
          return response.status(500).json({ error: error.message });
        }
      }
    },

    updateStatus: async (request, response) => {
      const allowedStatuses = new Set(["open", "reviewed", "actioned", "dismissed", "escalated"]);

      try {
        const { id } = request.params;
        const { status } = request.body || {};

        if (!allowedStatuses.has(status)) {
          return response.status(400).json({ error: "Invalid moderation status." });
        }

        const updates = {
          status,
          reviewedAt: Date.now(),
          reviewedBy: request.adminUser?.uid || null
        };
        let updatedFeedback = null;

        if (db) {
          const feedbackRef = db.collection("feedback").doc(id);
          const feedbackDoc = await feedbackRef.get();
          if (feedbackDoc.exists) {
            updatedFeedback = { ...feedbackDoc.data(), ...updates };
            await feedbackRef.set(updates, { merge: true });
          }
        }

        const allFeedback = await readJSON(localFeedbackPath);
        const localIndex = allFeedback.findIndex((feedback) => feedback.id === id);
        if (localIndex !== -1) {
          allFeedback[localIndex] = { ...allFeedback[localIndex], ...updates };
          updatedFeedback = updatedFeedback || allFeedback[localIndex];
          await writeJSON(localFeedbackPath, allFeedback);
        }

        if (!updatedFeedback) {
          return response.status(404).json({ error: "Feedback item not found." });
        }

        auditService?.record({
          actor: request.adminUser,
          action: updatedFeedback.type === "report" ? "report.moderated" : "feedback.moderated",
          target: id,
          details: `Status changed to ${status}`
        }).catch((auditError) => console.warn("Feedback audit record failed:", auditError.message));

        return response.json({ success: true, feedback: updatedFeedback });
      } catch (error) {
        console.error("Updating feedback status failed:", error);
        return response.status(500).json({ error: error.message });
      }
    }
  };
}
