import fs from "fs";
import path from "path";
import { runtimeDataPath } from "./runtimeDataPath.js";

const MOCK_DB_PATH = runtimeDataPath("manualDirectMessages.json");

export function readLocalDirectMessages() {
  try {
    if (fs.existsSync(MOCK_DB_PATH)) return JSON.parse(fs.readFileSync(MOCK_DB_PATH, "utf8"));
  } catch (error) {
    console.error("Failed to read local direct messages", error);
  }
  return [];
}

export function writeLocalDirectMessages(messages) {
  try {
    fs.mkdirSync(path.dirname(MOCK_DB_PATH), { recursive: true });
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(messages, null, 2));
  } catch (error) {
    console.error("Failed to write local direct messages", error);
  }
}
