import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localKeyPath = path.join(__dirname, "../../firebase-key.json");
const renderKeyPath = "/etc/secrets/firebase-key.json";
const keyPath = fs.existsSync(renderKeyPath) ? renderKeyPath : localKeyPath;

export function createFirestore() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  
  if (!projectId) {
    console.warn("⚠ FIREBASE_PROJECT_ID not set in .env");
    return null;
  }

  try {
    if (!admin.apps.length) {
      let credential;
      
      // Try to use firebase-key.json file if it exists
      if (fs.existsSync(keyPath)) {
        console.log(`📁 Reading Firebase credentials from ${keyPath}`);
        const keyFile = JSON.parse(fs.readFileSync(keyPath, "utf8"));
        credential = admin.credential.cert(keyFile);
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log("📁 Using GOOGLE_APPLICATION_CREDENTIALS environment variable");
        credential = admin.credential.applicationDefault();
      } else {
        console.warn("⚠ No Firebase credentials found");
        return null;
      }
      
      admin.initializeApp({
        credential,
        projectId
      });
      console.log("✓ Firestore persistence enabled");
    }
    return admin.firestore();
  } catch (error) {
    console.warn(`⚠ Firestore disabled: ${error.message}`);
    return null;
  }
}
