import process from "node:process";

const apiUrl = process.env.E2E_API_URL || "http://127.0.0.1:5000";
const userId = process.env.CODEFORA_VERIFY_USER_ID;
const idToken = process.env.CODEFORA_VERIFY_ID_TOKEN;

function setupHint(details = "") {
  return [
    details,
    "Real Firebase verification setup:",
    "1. Start the backend without CODEFORA_LOCAL_MODE=true.",
    "2. Set FIREBASE_PROJECT_ID and Firebase Admin credentials via firebase-key.json or GOOGLE_APPLICATION_CREDENTIALS.",
    "3. Set CODEFORA_REQUIRE_FIREBASE=true so startup fails instead of silently using mock services.",
    "4. Sign in through the frontend with the same Firebase project.",
    "5. Run with CODEFORA_VERIFY_USER_ID=<uid> and CODEFORA_VERIFY_ID_TOKEN=<fresh Firebase ID token>."
  ].filter(Boolean).join("\n");
}

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(idToken ? { authorization: `Bearer ${idToken}` } : {}),
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}: ${payload.error || response.statusText}`);
  }
  return payload;
}

const health = await request("/api/health");
if (health.firestore !== "real" || health.auth !== "real" || health.services?.rooms?.storage !== "firestore") {
  throw new Error(setupHint(`Real Firebase verification requires real services. Current modes: firestore=${health.firestore}, auth=${health.auth}, rooms=${health.services?.rooms?.storage || "unknown"}`));
}

if (!userId || !idToken) {
  throw new Error(setupHint("Missing CODEFORA_VERIFY_USER_ID or CODEFORA_VERIFY_ID_TOKEN for the signed-in Firebase user."));
}

const workName = `Real Firebase verification ${new Date().toISOString()}`;
const saveResult = await request(`/api/profiles/${encodeURIComponent(userId)}/save-work`, {
  method: "POST",
  body: JSON.stringify({
    name: workName,
    roomName: workName,
    type: "verification",
    files: [{ name: "verify.txt", language: "text", code: "real-firestore-save-check" }],
    notes: { text: "Real Firestore verification", draws: [] }
  })
});

const works = await request(`/api/profiles/${encodeURIComponent(userId)}/works`);
const found = Array.isArray(works) && works.some((work) => work.id === saveResult.work?.id && work.name === workName);
if (!found) {
  throw new Error("Saved work was not readable from the real profile works endpoint.");
}

console.log("Real Firebase verification passed: health is real and Save Work was written/read successfully.");
