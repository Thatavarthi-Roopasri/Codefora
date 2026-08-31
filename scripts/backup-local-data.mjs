import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const dataDir = path.join(process.cwd(), "backend", "data");
const backupDir = path.join(dataDir, "backups");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const files = [
  "rooms.json",
  "manualUsers.json",
  "localWorks.json",
  "manualNotifications.json",
  "manualDirectMessages.json"
];

await fs.mkdir(backupDir, { recursive: true });

const copied = [];
for (const file of files) {
  const source = path.join(dataDir, file);
  const target = path.join(backupDir, `${timestamp}-${file}`);
  try {
    await fs.copyFile(source, target);
    copied.push(path.relative(process.cwd(), target));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

if (copied.length === 0) {
  console.log("No local runtime data files found to back up.");
} else {
  console.log("Backed up local runtime data:");
  for (const file of copied) console.log(`- ${file}`);
}
