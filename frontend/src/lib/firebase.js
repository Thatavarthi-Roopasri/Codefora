import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore Database
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// ===== AUTHENTICATION FUNCTIONS =====

// Google Sign-In Function
export const signInWithGoogle = () => {
  return signInWithPopup(auth, googleProvider);
};

// Sign Out Function
export const logoutUser = () => {
  return signOut(auth);
};

// ===== STORAGE FUNCTIONS =====

// Upload file to Firebase Storage
export const uploadFile = async (userId, fileName, file) => {
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
export const uploadRoomData = async (roomId, dataFileName, data) => {
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
