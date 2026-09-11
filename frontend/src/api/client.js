import { API_URL } from "../config";
import { auth } from "../lib/firebase";
import { isLocalIdentityAllowed } from "../lib/session";

function getLocalUser() {
  if (typeof window === "undefined") return null;

  try {
    const uid = localStorage.getItem("codefora_user_id");
    const displayName = localStorage.getItem("codefora_username");
    if (!uid || uid.startsWith("guest-")) return null;

    return {
      uid,
      displayName: displayName || "Developer"
    };
  } catch {
    return null;
  }
}

function isLocalApi() {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(API_URL);
}

async function request(path, options) {
  const headers = { 
    "Content-Type": "application/json", 
    ...(options?.headers || {}) 
  };
  
  if (auth?.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken(false);
      headers["Authorization"] = `Bearer ${idToken}`;
      headers["X-Codefora-User-Id"] = auth.currentUser.uid;
      headers["X-Codefora-User-Name"] = auth.currentUser.displayName || auth.currentUser.email?.split("@")[0] || "Developer";
    } catch (e) {
      console.warn("Could not get Firebase ID token", e);
    }
  }

  if (!headers.Authorization && isLocalIdentityAllowed() && isLocalApi()) {
    const localUser = getLocalUser();
    if (localUser?.uid) {
      headers.Authorization = "Bearer local-dev-user";
      headers["X-Codefora-User-Id"] = localUser.uid;
      headers["X-Codefora-User-Name"] = localUser.displayName;
    }
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers,
      ...options
    });
  } catch {
    throw new Error("Cannot reach the Codefora API. Check that the backend is running.");
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : { error: await response.text() };
  if (!response.ok) {
    const detail = payload.error || payload.message || response.statusText || "Request failed";
    throw new Error(`${response.status} ${detail}`.trim());
  }
  return payload;
}

export const api = {
  request,
  listRooms: () => request("/api/rooms"),
  getRoom: (id, inviteCode, hostToken) => {
    let url = `/api/rooms/${id}`;
    const params = new URLSearchParams();
    if (inviteCode) params.append("inviteCode", inviteCode);
    if (hostToken) params.append("hostToken", hostToken);
    if (params.toString()) url += `?${params.toString()}`;
    return request(url);
  },
  getRoomByInviteCode: (code) => request(`/api/rooms/invite/${encodeURIComponent(code)}`),
  createRoom: (body) => request("/api/rooms", { method: "POST", body: JSON.stringify(body) }),
  saveRoomProject: (roomId, project) => request(`/api/rooms/${encodeURIComponent(roomId)}/project`, { method: "POST", body: JSON.stringify(project) }),
  resumeRoomProject: (roomId, workId) => request(`/api/rooms/${encodeURIComponent(roomId)}/project/resume`, { method: "POST", body: JSON.stringify({ workId }) }),
  endRoomProject: (roomId, project) => request(`/api/rooms/${encodeURIComponent(roomId)}/project/end`, { method: "POST", body: JSON.stringify(project) }),
  runCode: (body) => request("/api/compiler/run", { method: "POST", body: JSON.stringify(body) }),
  submitProblem: (body) => request("/api/compiler/submit", { method: "POST", body: JSON.stringify(body) }),
  askAi: (body) => request("/api/ai", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => request("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  signup: (body) => request("/api/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  bootstrapProfile: () => request("/api/profiles/bootstrap", { method: "POST" }),
  getProfile: (userId) => request(`/api/profiles/${encodeURIComponent(userId)}`),
  searchProfile: (query) => request(`/api/profiles/search/${encodeURIComponent(query)}`),
  saveProfile: (userId, profile) => request(`/api/profiles/${encodeURIComponent(userId)}`, { method: "POST", body: JSON.stringify(profile) }),
  saveWork: (userId, work) => request(`/api/profiles/${encodeURIComponent(userId)}/save-work`, { method: "POST", body: JSON.stringify(work) }),
  getWorks: (userId) => request(`/api/profiles/${encodeURIComponent(userId)}/works`),
  endWork: (userId, workId) => request(`/api/profiles/${encodeURIComponent(userId)}/works/${encodeURIComponent(workId)}/end`, { method: "POST", body: JSON.stringify({}) }),
  deleteWork: (userId, workId) => request(`/api/profiles/${encodeURIComponent(userId)}/works/${encodeURIComponent(workId)}`, { method: "DELETE" }),
  resumeSavedWorkRoom: (userId, workId) => request(`/api/profiles/${encodeURIComponent(userId)}/works/${encodeURIComponent(workId)}/resume-room`, { method: "POST", body: JSON.stringify({}) }),
  solveProblem: (userId, problemId) => request(`/api/profiles/${encodeURIComponent(userId)}/solve`, { method: "POST", body: JSON.stringify({ problemId }) }),
  removeFriend: (userId, friendId) => request(`/api/profiles/${encodeURIComponent(userId)}/friends/${encodeURIComponent(friendId)}`, { method: "DELETE" })
  ,sendDirectMessage: (body) => request("/api/messages", { method: "POST", body: JSON.stringify(body) })
  ,getDirectMessage: (messageId) => request(`/api/messages/${encodeURIComponent(messageId)}`)
  ,markDirectMessageSeen: (messageId) => request(`/api/messages/${encodeURIComponent(messageId)}/seen`, { method: "POST", body: JSON.stringify({}) })
};

// Export individual helpers for backward compatibility/flexibility
export const getProfile = api.getProfile;
export const saveProfile = api.saveProfile;
