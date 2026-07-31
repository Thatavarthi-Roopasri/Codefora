import { createFirestore } from "./backend/config/firebase.js";

async function run() {
  try {
    const db = createFirestore();
    console.log("Mock mode:", db.isMock);
    if (db.isMock) return;

    // Test query
    const existingReqs = await db.collection("notifications")
      .where("userId", "==", "test")
      .where("type", "==", "friend_request")
      .where("senderId", "==", "test2")
      .where("status", "==", "pending")
      .get();
      
    console.log("Query successful, empty:", existingReqs.empty);
  } catch (e) {
    console.error("Query failed:", e);
  }
}

run();
