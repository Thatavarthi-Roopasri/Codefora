import admin from "firebase-admin";
export { admin };
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localKeyPath = path.join(__dirname, "../../firebase-key.json");
const renderKeyPath = "/etc/secrets/firebase-key.json";
const keyPath = fs.existsSync(renderKeyPath) ? renderKeyPath : localKeyPath;

function createMockFirestore() {
  const mockCollection = () => {
    const chainObj = {
      doc: () => ({
        set: async () => {},
        get: async () => ({ exists: false, data: () => ({}) }),
        update: async () => {},
        delete: async () => {}
      }),
      orderBy: () => chainObj,
      limit: () => chainObj,
      where: () => chainObj,
      get: async () => ({ empty: true, docs: [] })
    };
    return chainObj;
  };
  return {
    isMock: true,
    collection: mockCollection,
    doc: () => ({
      set: async () => {},
      get: async () => ({ exists: false, data: () => ({}) }),
      update: async () => {},
      delete: async () => {}
    })
  };
}

export function createFirestore() {
  const projectId = process.env.FIREBASE_PROJECT_ID || "codefora-sandbox";
  
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
        console.warn("⚠ No Firebase credentials found. Using sandbox mode.");
        return createMockFirestore();
      }
      
      admin.initializeApp({
        credential,
        projectId
      });
      console.log("✓ Firestore persistence enabled");
    }
    return admin.firestore();
  } catch (error) {
    console.warn(`⚠ Firestore disabled: ${error.message}. Returning mock firestore.`);
    return createMockFirestore();
  }
}

export function createAuth() {
  try {
    if (!admin.apps.length) {
      createFirestore();
    }
    if (!admin.apps.length) {
      return {
        createUser: async () => ({ uid: "mock-uid" }),
        verifyIdToken: async () => ({ uid: "mock-uid" }),
        getUser: async () => ({ uid: "mock-uid" })
      };
    }
    return admin.auth();
  } catch (error) {
    console.warn(`⚠ Firebase Auth disabled: ${error.message}. Returning mock Auth.`);
    return {
      createUser: async () => ({ uid: "mock-uid" }),
      verifyIdToken: async () => ({ uid: "mock-uid" }),
      getUser: async () => ({ uid: "mock-uid" })
    };
  }
}
