import { admin, createFirestore } from "../config/firebase.js";

const db = createFirestore();
const SUPER_ADMIN_EMAIL = "ganeshvanamala16@gmail.com";

export async function adminAuth(request, response, next) {
  const authHeader = request.headers["authorization"];
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return response.status(401).json({ error: "Access denied. Admin token required." });
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // 1. Super Admin Check
    if (decodedToken.email === SUPER_ADMIN_EMAIL) {
      request.adminUser = { ...decodedToken, isSuperAdmin: true };
      return next();
    }

    // 2. Dynamic Admin Check (Firestore)
    if (db && !db.isMock) {
      const userDoc = await db.collection("users").doc(decodedToken.uid).get();
      if (userDoc.exists && userDoc.data().profile?.role === "admin") {
        request.adminUser = { ...decodedToken, isSuperAdmin: false };
        return next();
      }
    }

    return response.status(403).json({ error: "Forbidden. You are not an authorized admin." });
  } catch (error) {
    console.error("Admin Auth Error:", error.message);
    return response.status(403).json({ error: "Invalid or expired admin token." });
  }
}
