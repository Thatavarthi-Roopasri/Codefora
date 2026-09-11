import { initializeApp } from "firebase/app";
import { browserLocalPersistence, getAuth, GoogleAuthProvider, setPersistence, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { clearCodeforaSession } from "./session";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

// Initialize Firebase only when the environment has a complete client configuration.
const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;


// Initialize Auth
export const auth = app ? getAuth(app) : null;
const authPersistenceReady = auth
  ? setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.warn("Could not enable persistent sign-in:", error);
  })
  : Promise.resolve();

// Initialize Firestore Database
export const db = app ? getFirestore(app) : null;

// Initialize Storage
export const storage = app ? getStorage(app) : null;

// Initialize Google Auth Provider
export const googleProvider = app ? new GoogleAuthProvider() : null;

// ===== AUTHENTICATION FUNCTIONS =====

// Google Sign-In Function
export const signInWithGoogle = async () => {
  if (!auth) {
    throw new Error("Firebase auth is not configured for this local environment.");
  }
  await authPersistenceReady;
  return signInWithPopup(auth, googleProvider);
};

// Sign Out Function
export const logoutUser = async () => {
  if (auth) {
    await signOut(auth);
  }

  clearCodeforaSession();
};

// ===== STORAGE FUNCTIONS =====

// Upload file to Firebase Storage
export const uploadFile = async (userId, fileName) => {
  console.log("Would upload file:", userId, fileName);
  return null;
};

// Download file from Firebase Storage
export const downloadFile = async (userId, fileName) => {
  console.log("Would download file:", userId, fileName);
  return null;
};

// Delete file from Firebase Storage
export const deleteFile = async (userId, fileName) => {
  console.log("Would delete file:", userId, fileName);
};

// List all files for a user
export const listUserFiles = async (userId) => {
  console.log("Would list files for:", userId);
  return [];
};

// Upload room data (code, files) to Storage
export const uploadRoomData = async (roomId, dataFileName) => {
  console.log("Would upload room data:", roomId, dataFileName);
  return null;
};

// Download room data from Storage
export const downloadRoomData = async (roomId, dataFileName) => {
  console.log("Would download room data:", roomId, dataFileName);
  return null;
};

// ===== FIRESTORE FUNCTIONS =====

// Save user profile to Firestore
export const saveUserProfile = async (userId, profileData) => {
  console.log("Would save user profile:", userId, profileData);
};

// Get user profile from Firestore
export const getUserProfile = async (userId) => {
  console.log("Would get user profile:", userId);
  return null;
};

// Create a new room in Firestore
export const createRoom = async (roomData) => {
  console.log("Would create room:", roomData);
  return null;
};

// Get room details from Firestore
export const getRoom = async (roomId) => {
  console.log("Would get room:", roomId);
  return null;
};

// Update room data in Firestore
export const updateRoom = async (roomId, roomData) => {
  console.log("Would update room:", roomId, roomData);
};

// Save code file metadata to Firestore
export const saveCodeFile = async (roomId, fileData) => {
  console.log("Would save code file:", roomId, fileData);
  return null;
};

// Get code files from Firestore
export const getCodeFiles = async (roomId) => {
  console.log("Would get code files for:", roomId);
  return [];
};

// Save room activity log
export const logActivity = async (roomId, activity) => {
  console.log("Would log activity:", roomId, activity);
};

export default app;
