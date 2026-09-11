import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localServiceAccountPath = path.join(__dirname, "../../firebase-key.json");
const renderServiceAccountPath = "/etc/secrets/firebase-key.json";

function hasValue(name) {
  return Boolean(String(process.env[name] || "").trim());
}

function firebaseCredentialStatus() {
  if (fs.existsSync(renderServiceAccountPath)) {
    return { ok: true, source: "render-secret-file", path: renderServiceAccountPath };
  }
  if (fs.existsSync(localServiceAccountPath)) {
    return { ok: true, source: "local-service-account-file", path: localServiceAccountPath };
  }
  if (hasValue("GOOGLE_APPLICATION_CREDENTIALS")) {
    return { ok: true, source: "application-default-credentials", path: process.env.GOOGLE_APPLICATION_CREDENTIALS };
  }
  return { ok: false, source: "missing", path: "" };
}

export function isProductionEnvRequired() {
  return process.env.NODE_ENV === "production" || process.env.CODEFORA_REQUIRE_FIREBASE === "true";
}

export function validateStartupEnv({ strict = isProductionEnvRequired() } = {}) {
  const errors = [];
  const warnings = [];
  const firebaseCredential = firebaseCredentialStatus();

  if (strict && process.env.CODEFORA_LOCAL_MODE === "true") {
    errors.push("CODEFORA_LOCAL_MODE must not be true for production.");
  }

  if (strict && !hasValue("FIREBASE_PROJECT_ID")) {
    errors.push("FIREBASE_PROJECT_ID is required for production Firebase Admin.");
  }

  if (strict && !firebaseCredential.ok) {
    errors.push("Firebase Admin credentials are required: provide firebase-key.json, /etc/secrets/firebase-key.json, or GOOGLE_APPLICATION_CREDENTIALS.");
  }

  if (strict && !hasValue("CLIENT_ORIGIN")) {
    warnings.push("CLIENT_ORIGIN is not set. CORS will only allow the built-in Codefora/local origins.");
  }

  if (!hasValue("GROQ_API_KEY") && !hasValue("GEMINI_API_KEY") && !hasValue("OLLAMA_BASE_URL")) {
    warnings.push("No AI provider config found. AI features will use fallback behavior.");
  }

  if (!hasValue("JUDGE0_URL") || !hasValue("JUDGE0_KEY")) {
    warnings.push("Judge0 is not fully configured. Code execution will use local/fallback execution where available.");
  }

  return {
    ok: errors.length === 0,
    strict,
    nodeEnv: process.env.NODE_ENV || "development",
    firebaseProjectId: hasValue("FIREBASE_PROJECT_ID") ? "set" : "missing",
    firebaseCredential: {
      ok: firebaseCredential.ok,
      source: firebaseCredential.source
    },
    clientOrigin: hasValue("CLIENT_ORIGIN") ? "set" : "missing",
    aiProvider: hasValue("GROQ_API_KEY") ? "groq" : hasValue("GEMINI_API_KEY") ? "gemini" : hasValue("OLLAMA_BASE_URL") ? "ollama" : "missing",
    judge0: hasValue("JUDGE0_URL") && hasValue("JUDGE0_KEY") ? "set" : "missing",
    errors,
    warnings
  };
}

export function assertStartupEnv() {
  const validation = validateStartupEnv();
  for (const warning of validation.warnings) {
    console.warn(`[env] ${warning}`);
  }
  if (!validation.ok) {
    const message = [
      "Codefora startup environment validation failed:",
      ...validation.errors.map((error) => `- ${error}`),
      "See DEPLOYMENT_CHECKLIST.md and .env.example for required variables."
    ].join("\n");
    throw new Error(message);
  }
  return validation;
}
