import { createAuth } from "../config/firebase.js";

const auth = createAuth();

function localMockUser(request) {
  const localUserId = String(request.headers["x-codefora-user-id"] || request.params.userId || "").trim();
  return {
    uid: localUserId || "mock-uid",
    name: request.headers["x-codefora-user-name"] || "Local Developer",
    email: "",
    firebase: { sign_in_provider: "local" }
  };
}

export async function firebaseAuth(request, response, next) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return response.status(401).json({ error: "Authentication is required." });
  }

  try {
    if (auth.isMock && process.env.NODE_ENV !== "production") {
      request.firebaseUser = localMockUser(request);
      return next();
    }

    request.firebaseUser = await auth.verifyIdToken(authHeader.slice(7));
    return next();
  } catch {
    return response.status(401).json({ error: "Your sign-in session is invalid or has expired." });
  }
}

export async function optionalFirebaseAuth(request, _response, next) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return next();

  try {
    if (auth.isMock && process.env.NODE_ENV !== "production") {
      request.firebaseUser = localMockUser(request);
      return next();
    }

    request.firebaseUser = await auth.verifyIdToken(authHeader.slice(7));
  } catch {
    request.firebaseUser = null;
  }

  return next();
}

export function requireCurrentUser(request, response, next) {
  const requestedUserId = String(request.params.userId || "").trim();

  if (!requestedUserId || !request.firebaseUser?.uid) {
    return response.status(401).json({ error: "Authentication is required." });
  }

  if (request.firebaseUser.uid !== requestedUserId) {
    return response.status(403).json({ error: "You can only access your own account data." });
  }

  return next();
}
