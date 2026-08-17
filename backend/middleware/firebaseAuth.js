import { createAuth } from "../config/firebase.js";

const auth = createAuth();

export async function firebaseAuth(request, response, next) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return response.status(401).json({ error: "Authentication is required." });
  }

  try {
    request.firebaseUser = await auth.verifyIdToken(authHeader.slice(7));
    return next();
  } catch (error) {
    return response.status(401).json({ error: "Your sign-in session is invalid or has expired." });
  }
}
