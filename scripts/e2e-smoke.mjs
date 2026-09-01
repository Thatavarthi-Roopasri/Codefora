import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import puppeteer from "puppeteer";

const frontendUrl = process.env.E2E_FRONTEND_URL || "http://127.0.0.1:3000";
const apiUrl = process.env.E2E_API_URL || "http://127.0.0.1:5000";
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const userId = `e2e-user-${Date.now()}`;
const e2eDataDir = process.env.CODEFORA_DATA_DIR || await fs.mkdtemp(path.join(os.tmpdir(), "codefora-e2e-data-"));
const localUsersPath = path.join(e2eDataDir, "manualUsers.json");
const localRoomsPath = path.join(e2eDataDir, "rooms.json");
const localWorksPath = path.join(e2eDataDir, "localWorks.json");
const runtimeDataPaths = [localUsersPath, localRoomsPath, localWorksPath];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(url, label) {
  const deadline = Date.now() + 45_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      lastError = new Error(`${label} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(750);
  }
  throw new Error(`${label} did not become ready: ${lastError?.message || "timeout"}`);
}

async function isReady(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      authorization: "Bearer local-e2e-token",
      "x-codefora-user-id": userId,
      "x-codefora-user-name": "E2E Runner",
      ...(options.headers || {})
    }
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}: ${payload.error || response.statusText}`);
  }
  return payload;
}

async function runLifecycleThroughApi() {
  const roomName = `E2E Lifecycle ${Date.now()}`;
  const room = await apiRequest("/api/rooms", {
    method: "POST",
    body: JSON.stringify({
      name: roomName,
      visibility: "private",
      username: "E2E Runner",
      userId,
      max: 2
    })
  });

  const files = [
    { name: "index.html", language: "html", code: "<main>Saved from browser E2E</main>" },
    { name: "style.css", language: "css", code: "main { color: seagreen; }" }
  ];
  const notes = { text: "Browser E2E notes", draws: [] };

  const saved = await apiRequest(`/api/rooms/${encodeURIComponent(room.id)}/project`, {
    method: "POST",
    body: JSON.stringify({ title: roomName, activeFile: "style.css", files, notes })
  });

  const ended = await apiRequest(`/api/rooms/${encodeURIComponent(room.id)}/project/end`, {
    method: "POST",
    body: JSON.stringify({ title: roomName, activeFile: "index.html", files, notes })
  });

  const blockedEdit = await fetch(`${apiUrl}/api/rooms/${encodeURIComponent(room.id)}/project`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer local-e2e-token",
      "x-codefora-user-id": userId,
      "x-codefora-user-name": "E2E Runner"
    },
    body: JSON.stringify({ files })
  });
  if (blockedEdit.status !== 409) {
    throw new Error(`Completed project accepted edits unexpectedly: ${blockedEdit.status}`);
  }

  const reopened = await apiRequest(`/api/profiles/${encodeURIComponent(userId)}/works/${encodeURIComponent(saved.work.id)}/resume-room`, {
    method: "POST",
    body: JSON.stringify({})
  });

  if (ended.work.projectStatus !== "completed" || !reopened.room.readOnly) {
    throw new Error("Save -> End -> Resume did not preserve completed read-only state.");
  }
  if (reopened.room.activeFile !== "index.html") {
    throw new Error("Resume did not restore the active file.");
  }
  if (!reopened.room.files?.some((file) => file.name === "index.html" && file.code.includes("Saved from browser E2E"))) {
    throw new Error("Resume did not restore saved file contents.");
  }
  if (reopened.room.notes?.text !== notes.text) {
    throw new Error("Resume did not restore saved notes.");
  }

  return reopened.room;
}

async function runProfilePlaceholderRepairSmoke() {
  let original = "{}";
  try {
    original = await fs.readFile(localUsersPath, "utf8");
  } catch {
    // The file is created lazily in local mode.
  }

  const profileUserId = `e2e-profile-${Date.now()}`;
  try {
    await fetch(`${apiUrl}/api/profiles/${encodeURIComponent(profileUserId)}`);
    const response = await fetch(`${apiUrl}/api/profiles/${encodeURIComponent(profileUserId)}`, {
      headers: {
        authorization: "Bearer local-e2e-token",
        "x-codefora-user-id": profileUserId,
        "x-codefora-user-name": "E2E Profile"
      }
    });
    const profile = await response.json();
    if (profile.displayName !== "E2E Profile") {
      throw new Error(`Profile placeholder was not repaired: ${profile.displayName || "(blank)"}`);
    }
  } finally {
    await fs.writeFile(localUsersPath, original);
  }
}

async function runAuthSaveUiSmoke(page) {
  await page.goto(`${frontendUrl}/playground`, { waitUntil: "networkidle2" });
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    if (globalThis.indexedDB && globalThis.indexedDB.databases) {
      const databases = await globalThis.indexedDB.databases();
      await Promise.all(databases.map((database) => database.name && new Promise((resolve) => {
        const request = globalThis.indexedDB.deleteDatabase(database.name);
        request.onsuccess = resolve;
        request.onerror = resolve;
        request.onblocked = resolve;
      })));
    }
  });
  await page.reload({ waitUntil: "networkidle2" });
  let headerText = await page.evaluate(() => document.querySelector("header")?.innerText || "");
  if (!headerText.includes("Login") || headerText.includes("Logout")) {
    throw new Error("Logged-out navbar did not show Login-only state.");
  }

  const guestClicked = await page.evaluate(() => {
    const save = Array.from(document.querySelectorAll("button")).find((button) => button.textContent.includes("Save Work"));
    if (!save) return false;
    save.click();
    return true;
  });
  if (!guestClicked) throw new Error("Save Work button was not found for guest smoke.");
  await page.waitForFunction(() => document.body.innerText.includes("Login required"), { timeout: 15_000 });
  let text = await page.evaluate(() => document.body.innerText);
  if (!text.includes("Please login to save your work.")) {
    throw new Error("Guest Save Work did not show the login-required prompt.");
  }

  const localUserId = `e2e-local-login-${Date.now()}`;
  await page.evaluate((id) => {
    localStorage.setItem("codefora_user_id", id);
    localStorage.setItem("codefora_username", "E2E Local");
  }, localUserId);
  await page.reload({ waitUntil: "networkidle2" });
  headerText = await page.evaluate(() => document.querySelector("header")?.innerText || "");
  if (headerText.includes("Login") || headerText.includes("Logout")) {
    throw new Error("Logged-in navbar should show the profile icon before opening the menu.");
  }

  await page.evaluate(() => {
    const headerButtons = Array.from(document.querySelectorAll("header button"));
    headerButtons[headerButtons.length - 1]?.click();
  });
  await page.waitForFunction(() => document.body.innerText.includes("Logout"), { timeout: 10_000 });
  headerText = await page.evaluate(() => document.querySelector("header")?.innerText || "");
  if (headerText.includes("Login") || !headerText.includes("View Profile") || !headerText.includes("Logout")) {
    throw new Error("Logged-in navbar did not show profile/logout state.");
  }

  const userClicked = await page.evaluate(() => {
    const save = Array.from(document.querySelectorAll("button")).find((button) => button.textContent.includes("Save Work"));
    if (!save) return false;
    save.click();
    return true;
  });
  if (!userClicked) throw new Error("Save Work button was not found for logged-in smoke.");
  await page.waitForFunction(() => document.body.innerText.includes("Name of the project"), { timeout: 10_000 });
  await page.click('input[placeholder="My project"]', { clickCount: 3 });
  await page.type('input[placeholder="My project"]', "E2E Named Playground");
  await page.evaluate(() => {
    const modalButtons = Array.from(document.querySelectorAll('[role="dialog"] button'));
    const submit = modalButtons.find((button) => button.textContent.includes("Save Work"));
    if (!submit) throw new Error("Save Work modal submit button was not found.");
    submit.click();
  });
  await page.waitForFunction(() => /Saved to (Local\/mock JSON|Real Firestore) at/.test(document.body.innerText), { timeout: 15_000 });
  text = await page.evaluate(() => document.body.innerText);
  if (text.includes("Login required")) {
    throw new Error("Logged-in Save Work incorrectly showed login prompt.");
  }
  return localUserId;
}

async function snapshotRuntimeData() {
  const snapshot = new Map();
  for (const filePath of runtimeDataPaths) {
    try {
      snapshot.set(filePath, await fs.readFile(filePath, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      snapshot.set(filePath, null);
    }
  }
  return snapshot;
}

async function restoreRuntimeData(snapshot) {
  for (const [filePath, content] of snapshot.entries()) {
    if (content === null) {
      await fs.rm(filePath, { force: true });
    } else {
      await fs.writeFile(filePath, content);
    }
  }
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function stopProcessTree(childProcess) {
  if (!childProcess?.pid) return;
  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(childProcess.pid), "/t", "/f"], { stdio: "ignore" });
      killer.on("close", resolve);
      killer.on("error", resolve);
    });
    return;
  }

  childProcess.kill("SIGTERM");
  await sleep(500);
}

async function cleanupE2EArtifacts(localLoginUserId) {
  const testUserIds = new Set([userId, localLoginUserId].filter(Boolean));

  const rooms = await readJson(localRoomsPath, []);
  if (Array.isArray(rooms)) {
    const cleanedRooms = rooms.filter((room) => {
      const isCurrentRunRoom =
        room.ownerUserId === userId ||
        String(room.name || "").startsWith("E2E Lifecycle ") ||
        room.hostName === "E2E Runner";
      return !isCurrentRunRoom;
    });
    if (cleanedRooms.length !== rooms.length) await writeJson(localRoomsPath, cleanedRooms);
  }

  const works = await readJson(localWorksPath, {});
  const cleanedWorks = Object.fromEntries(Object.entries(works).filter(([, work]) => {
    const ownerId = String(work.ownerId || "");
    const isCurrentRunWork =
      testUserIds.has(ownerId) ||
      ownerId.startsWith("e2e-user-") ||
      ownerId.startsWith("e2e-local-login-") ||
      String(work.name || "").startsWith("E2E Lifecycle ");
    return !isCurrentRunWork;
  }));
  if (Object.keys(cleanedWorks).length !== Object.keys(works).length) await writeJson(localWorksPath, cleanedWorks);

  const users = await readJson(localUsersPath, {});
  let changedUsers = false;
  for (const key of Object.keys(users)) {
    if (key === userId || key === localLoginUserId || key.startsWith("e2e-user-") || key.startsWith("e2e-profile-") || key.startsWith("e2e-local-login-")) {
      delete users[key];
      changedUsers = true;
    }
  }
  if (changedUsers) await writeJson(localUsersPath, users);
}

let devProcess;
let browser;
let localLoginUserId = null;
const runtimeDataSnapshot = await snapshotRuntimeData();

try {
  const existingBackend = await isReady(`${apiUrl}/api/health`);
  const existingFrontend = await isReady(frontendUrl);
  if (existingBackend && existingFrontend) {
    if (process.env.E2E_REUSE_EXISTING_SERVERS !== "true") {
      throw new Error("Local Codefora servers are already running. Stop them before E2E, or set E2E_REUSE_EXISTING_SERVERS=true if you intentionally want tests to use the active app data.");
    }
    console.log("Reusing existing local Codefora servers for E2E by explicit request.");
  } else {
    devProcess = spawn(npmCmd, ["run", "dev"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        CODEFORA_LOCAL_MODE: "true",
        CODEFORA_DATA_DIR: e2eDataDir,
        NODE_ENV: "development"
      },
      stdio: "pipe",
      shell: process.platform === "win32"
    });

    devProcess.stdout.on("data", (chunk) => process.stdout.write(chunk));
    devProcess.stderr.on("data", (chunk) => process.stderr.write(chunk));
  }

  await waitFor(`${apiUrl}/api/health`, "backend");
  await waitFor(frontendUrl, "frontend");

  const health = await (await fetch(`${apiUrl}/api/health`)).json();
  if (health.firestore !== "mock" || health.services?.rooms?.storage !== "local-json") {
    throw new Error("Local E2E expected mock/local-json storage.");
  }

  const reopenedRoom = await runLifecycleThroughApi();
  await runProfilePlaceholderRepairSmoke();

  browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const page = await browser.newPage();
  const browserMessages = [];
  page.on("console", (message) => browserMessages.push(`${message.type()}: ${message.text()}`));
  page.on("pageerror", (error) => browserMessages.push(`pageerror: ${error.message}`));
  await page.goto(frontendUrl, { waitUntil: "networkidle2" });
  await page.waitForSelector("body");
  const landingText = await page.evaluate(() => document.body.innerText);
  if (!/Codefora|Continue as Guest/i.test(landingText)) {
    throw new Error("Landing page did not render expected Codefora content.");
  }

  localLoginUserId = await runAuthSaveUiSmoke(page);

  await page.evaluate((id) => {
    localStorage.setItem("codefora_user_id", id);
    localStorage.setItem("codefora_username", "E2E Runner");
  }, userId);
  await page.goto(`${frontendUrl}/code/${encodeURIComponent(reopenedRoom.id)}`, { waitUntil: "networkidle2" });
  try {
    await page.waitForSelector(".workspace-main-v3", { timeout: 20_000 });
  } catch (error) {
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 800));
    const bodyHtml = await page.evaluate(() => document.body.innerHTML.slice(0, 800));
    console.error("Browser URL:", page.url());
    console.error("Browser text:", bodyText);
    console.error("Browser HTML:", bodyHtml);
    console.error("Browser messages:", browserMessages.slice(-20).join("\n"));
    throw error;
  }
  const hasWorkspace = await page.evaluate(() => Boolean(document.querySelector(".workspace-main-v3")));
  if (!hasWorkspace) {
    throw new Error("Reopened room did not render the expected workspace shell.");
  }

  console.log("E2E smoke passed: health, browser render, auth-gated Save Work, profile name repair, save/end/resume, and completed edit rejection.");
} finally {
  if (browser) await browser.close();
  await cleanupE2EArtifacts(localLoginUserId);
  await restoreRuntimeData(runtimeDataSnapshot);
  if (devProcess) {
    await stopProcessTree(devProcess);
  }
}
