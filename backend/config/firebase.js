import admin from "firebase-admin";
export { admin };
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localKeyPath = path.join(__dirname, "../../firebase-key.json");
const renderKeyPath = "/etc/secrets/firebase-key.json";
const keyPath = fs.existsSync(renderKeyPath) ? renderKeyPath : localKeyPath;
const firebaseServiceStatus = {
  firestore: {
    mode: "unknown",
    projectId: process.env.FIREBASE_PROJECT_ID || "codefora-sandbox",
    credentialSource: "unresolved",
    reason: "Firestore has not been initialized yet."
  },
  auth: {
    mode: "unknown",
    projectId: process.env.FIREBASE_PROJECT_ID || "codefora-sandbox",
    reason: "Firebase Auth has not been initialized yet."
  }
};

function mockFirebaseAllowed() {
  return process.env.CODEFORA_ALLOW_MOCK_FIREBASE === "true";
}

function firebaseRequired() {
  return process.env.CODEFORA_REQUIRE_FIREBASE === "true"
    || (process.env.NODE_ENV === "production" && !mockFirebaseAllowed());
}

function createFirebaseConfigError(reason) {
  const error = new Error(`${reason} Set Firebase Admin credentials, or set CODEFORA_ALLOW_MOCK_FIREBASE=true only for an intentional non-production mock deploy.`);
  error.code = "CODEFORA_FIREBASE_REQUIRED";
  return error;
}

function setFirestoreStatus(mode, details = {}) {
  firebaseServiceStatus.firestore = {
    mode,
    projectId: process.env.FIREBASE_PROJECT_ID || "codefora-sandbox",
    credentialSource: details.credentialSource || firebaseServiceStatus.firestore.credentialSource,
    reason: details.reason || ""
  };
}

function setAuthStatus(mode, details = {}) {
  firebaseServiceStatus.auth = {
    mode,
    projectId: process.env.FIREBASE_PROJECT_ID || "codefora-sandbox",
    reason: details.reason || ""
  };
}

export function getFirebaseServiceStatus() {
  return {
    firestore: { ...firebaseServiceStatus.firestore },
    auth: { ...firebaseServiceStatus.auth }
  };
}

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
  if (process.env.CODEFORA_LOCAL_MODE === "true") {
    if (firebaseRequired()) {
      const reason = "CODEFORA_LOCAL_MODE cannot provide Firestore persistence when Firebase is required.";
      setFirestoreStatus("mock", {
        credentialSource: "local-mode",
        reason
      });
      throw createFirebaseConfigError(reason);
    }
    console.warn("Local mode enabled. Using in-memory Firebase services.");
    setFirestoreStatus("mock", {
      credentialSource: "local-mode",
      reason: "CODEFORA_LOCAL_MODE is enabled."
    });
    return createMockFirestore();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || "codefora-sandbox";

  try {
    if (!admin.apps.length) {
      let credential;

      if (fs.existsSync(keyPath)) {
        console.log(`Reading Firebase credentials from ${keyPath}`);
        const keyFile = JSON.parse(fs.readFileSync(keyPath, "utf8"));
        credential = admin.credential.cert(keyFile);
        setFirestoreStatus("initializing", {
          credentialSource: keyPath === renderKeyPath ? "render-secret-file" : "local-service-account-file",
          reason: "Firebase service account file found."
        });
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log("Using GOOGLE_APPLICATION_CREDENTIALS environment variable");
        credential = admin.credential.applicationDefault();
        setFirestoreStatus("initializing", {
          credentialSource: "application-default-credentials",
          reason: "GOOGLE_APPLICATION_CREDENTIALS is configured."
        });
      } else {
        if (firebaseRequired()) {
          const reason = "No Firebase credentials were found.";
          setFirestoreStatus("mock", {
            credentialSource: "none",
            reason
          });
          throw createFirebaseConfigError(reason);
        }
        console.warn("No Firebase credentials found. Using sandbox mode.");
        setFirestoreStatus("mock", {
          credentialSource: "none",
          reason: "No Firebase credentials were found."
        });
        return createMockFirestore();
      }

      admin.initializeApp({
        credential,
        projectId
      });
      console.log("Firestore persistence enabled");
    }
    setFirestoreStatus("real", {
      credentialSource: firebaseServiceStatus.firestore.credentialSource === "unresolved"
        ? "existing-admin-app"
        : firebaseServiceStatus.firestore.credentialSource,
      reason: "Firebase Admin SDK is initialized."
    });
    return admin.firestore();
  } catch (error) {
    if (firebaseRequired() || error.code === "CODEFORA_FIREBASE_REQUIRED") {
      console.error(`Firestore required but unavailable: ${error.message}`);
      throw error;
    }
    console.warn(`Firestore disabled: ${error.message}. Returning mock firestore.`);
    setFirestoreStatus("mock", {
      credentialSource: firebaseServiceStatus.firestore.credentialSource,
      reason: error.message
    });
    return createMockFirestore();
  }
}

export function createAuth() {
  try {
    if (!admin.apps.length) {
      createFirestore();
    }
    if (!admin.apps.length) {
      setAuthStatus("mock", {
        reason: "Firebase Admin SDK is unavailable."
      });
      return {
        isMock: true,
        createUser: async () => ({ uid: "mock-uid" }),
        verifyIdToken: async () => ({ uid: "mock-uid" }),
        getUser: async () => ({ uid: "mock-uid" })
      };
    }
    setAuthStatus("real", {
      reason: "Firebase Admin Auth is initialized."
    });
    return admin.auth();
  } catch (error) {
    if (firebaseRequired() || error.code === "CODEFORA_FIREBASE_REQUIRED") {
      console.error(`Firebase Auth required but unavailable: ${error.message}`);
      throw error;
    }
    console.warn(`Firebase Auth disabled: ${error.message}. Returning mock Auth.`);
    setAuthStatus("mock", {
      reason: error.message
    });
    return {
      isMock: true,
      createUser: async () => ({ uid: "mock-uid" }),
      verifyIdToken: async () => ({ uid: "mock-uid" }),
      getUser: async () => ({ uid: "mock-uid" })
    };
  }
}
