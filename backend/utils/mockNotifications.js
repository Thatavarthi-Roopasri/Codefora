import fs from "fs";
import path from "path";
import { runtimeDataPath } from "./runtimeDataPath.js";

const MOCK_DB_PATH = runtimeDataPath("manualNotifications.json");

export async function readLocalNotifications() {
  try {
    if (fs.existsSync(MOCK_DB_PATH)) {
      return JSON.parse(fs.readFileSync(MOCK_DB_PATH, "utf8"));
    }
  } catch (err) {
    console.error("Failed to read local notifications", err);
  }
  return [];
}

export async function writeLocalNotifications(data) {
  try {
    const dir = path.dirname(MOCK_DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to write local notifications", err);
  }
}
