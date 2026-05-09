import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getApp } from "firebase/app";

let db;

try {
  // Get existing Firebase app initialized by firebase.js
  const app = getApp();
  db = getFirestore(app);
} catch (error) {
  // If no app exists yet, we might need to initialize
  console.warn("Firebase app not initialized in firebaseClient:", error.message);
}

export async function saveProfileToFirestore(userId, profileData) {
  try {
    await setDoc(doc(db, "users", userId), {
      profile: profileData,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error saving profile:", error);
    return false;
  }
}

export async function loadProfileFromFirestore(userId) {
  try {
    const docSnap = await getDoc(doc(db, "users", userId));
    if (docSnap.exists()) {
      return docSnap.data().profile || {};
    }
    return {};
  } catch (error) {
    console.error("Error loading profile:", error);
    return {};
  }
}
