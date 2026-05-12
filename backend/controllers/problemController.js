import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

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

export function createProblemController() {
  return {
    list: async (request, response) => {
      try {
        const problems = await readJSON(localProblemsPath);
        // Return only published problems for public view
        const published = problems.filter(p => p.published !== false);
        return response.json(published);
      } catch (error) {
        return response.status(500).json({ error: "Could not fetch problems" });
      }
    },
    get: async (request, response) => {
      try {
        const { id } = request.params;
        const problems = await readJSON(localProblemsPath);
        const problem = problems.find(p => p.id === id);
        if (!problem) return response.status(404).json({ error: "Problem not found" });
        return response.json(problem);
      } catch (error) {
        return response.status(500).json({ error: "Could not fetch problem" });
      }
    }
  };
}
