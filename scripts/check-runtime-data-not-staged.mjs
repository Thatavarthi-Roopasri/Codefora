import { spawnSync } from "node:child_process";
import process from "node:process";

const protectedFiles = new Set([
  "backend/data/rooms.json",
  "backend/data/manualUsers.json",
  "backend/data/localWorks.json",
  "backend/data/manualNotifications.json",
  "backend/data/manualDirectMessages.json"
]);

const git = spawnSync("git", ["diff", "--cached", "--name-only"], {
  encoding: "utf8",
  shell: process.platform === "win32"
});

if (git.error) {
  console.error("Could not run git to check staged runtime data. Run this on a machine with Git before pushing.");
  process.exit(1);
}

if (git.status !== 0) {
  const output = `${git.stderr || ""}${git.stdout || ""}`;
  if (/not recognized|not found|No such file/i.test(output)) {
    console.error("Could not run git to check staged runtime data. Install Git or add it to PATH before pushing.");
    process.exit(1);
  }
  process.stderr.write(git.stderr || git.stdout);
  process.exit(git.status || 1);
}

const stagedProtected = git.stdout
  .split(/\r?\n/)
  .map((line) => line.trim().replace(/\\/g, "/"))
  .filter((file) => protectedFiles.has(file));

if (stagedProtected.length > 0) {
  console.error("Do not push local runtime data files. Unstage these first:");
  for (const file of stagedProtected) console.error(`- ${file}`);
  process.exit(1);
}

console.log("Runtime data push check passed: no protected local data files are staged.");
