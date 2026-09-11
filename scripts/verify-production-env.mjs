import "dotenv/config";
import process from "node:process";
import { validateStartupEnv } from "../backend/config/envValidation.js";

const frontendRequired = [
  "VITE_API_URL",
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID"
];

const backend = validateStartupEnv({ strict: true });
const missingFrontend = frontendRequired.filter((name) => !String(process.env[name] || "").trim());
const errors = [
  ...backend.errors,
  ...missingFrontend.map((name) => `${name} is required for production frontend auth/API configuration.`)
];

for (const warning of backend.warnings) {
  console.warn(`[production-env] ${warning}`);
}

if (errors.length > 0) {
  console.error("Production environment check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  console.error("See DEPLOYMENT_CHECKLIST.md and .env.example.");
  process.exit(1);
}

console.log("Production environment check passed: backend Firebase credentials, frontend API URL, and Firebase client config are present.");
