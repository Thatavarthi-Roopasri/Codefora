import { 
  uploadRoomData,
  downloadRoomData,
  saveUserProfile,
  getUserProfile,
  createRoom,
  updateRoom,
  getRoom,
  logActivity,
  saveCodeFile,
  getCodeFiles
} from "../lib/firebase";

/**
 * Firebase Storage Service for Codefora
 * Theprovides high-level functions for storing user data, room code, and collaboration metadata
 */

/**
 * Store user profile to Firestore after Google sign-in
 * Automatically called when user authenticates
 */
export const storeUserProfile = async (userId, authUser) => {
  try {
    const profileData = {
      uid: userId,
      email: authUser.email,
      displayName: authUser.displayName || "Anonymous",
      photoURL: authUser.photoURL || "",
      lastLogin: new Date().toISOString(),
      rooms: [],
      settings: {
        theme: "dark",
        language: "javascript"
      }
    };
    
    await saveUserProfile(userId, profileData);
    
    return profileData;
  } catch (error) {
    console.error("Error storing user profile:", error);
    // Don't throw - profile storage is non-critical
    return null;
  }
};

/**
 * Fetch user profile from Firestore
 */
export const fetchUserProfile = async (userId) => {
  try {
    return await getUserProfile(userId);
  } catch (error) {
    console.warn("Could not fetch user profile:", error);
    return null;
  }
};

/**
 * Save code to a room's storage
 */
export const saveCodeToRoom = async (roomId, fileName, code, language) => {
  try {
    // Save code content to Firebase Storage
    await uploadRoomData(roomId, `code/${fileName}`, {
      fileName,
      code,
      language,
      savedAt: new Date().toISOString()
    });
    
    // Save file metadata to Firestore
    const fileId = await saveCodeFile(roomId, {
      fileName,
      language,
      size: code.length,
      savedAt: new Date().toISOString()
    });
    
    // Log the activity
    await logActivity(roomId, {
      type: "code_saved",
      fileName,
      language
    });
    
    return fileId;
  } catch (error) {
    console.error("Error saving code to room:", error);
    throw error;
  }
};

/**
 * Get code from room storage
 */
export const getCodeFromRoom = async (roomId, fileName) => {
  try {
    return await downloadRoomData(roomId, `code/${fileName}`);
  } catch (error) {
    console.error("Error getting code from room:", error);
    throw error;
  }
};

/**
 * Initialize a new room in Firestore and Storage
 */
export const initializeRoom = async (roomId, roomCreator, roomData = {}) => {
  try {
    //Create room metadata document
    await uploadRoomData(roomId, "metadata.json", {
      roomId,
      createdBy: roomCreator,
      ...roomData,
      participants: [roomCreator],
      files: [],
      createdAt: new Date().toISOString(),
      status: "active"
    });
    
    // Create room entry in Firestore for indexing
    await createRoom({
      roomId,
      createdBy: roomCreator,
      ...roomData,
      participants: [roomCreator],
      files: []
    });
    
    // Log activity
    await logActivity(roomId, {
      type: "room_created",
      creator: roomCreator
    });
    
    return roomId;
  } catch (error) {
    console.error("Error initializing room:", error);
    throw error;
  }
};

export default {
  storeUserProfile,
  fetchUserProfile,
  saveCodeToRoom,
  getCodeFromRoom,
  initializeRoom
};
