import { API_URL } from "../config";
import { auth } from "../lib/firebase";

async function request(path, options) {
  const headers = { 
    "Content-Type": "application/json", 
    ...(options?.headers || {}) 
  };
  
  if (auth.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken(false);
      headers["Authorization"] = `Bearer ${idToken}`;
    } catch (e) {
      console.warn("Could not get Firebase ID token", e);
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    headers,
    ...options
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Request failed");
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
  runCode: (body) => request("/api/compiler/run", { method: "POST", body: JSON.stringify(body) }),
  askAi: (body) => request("/api/ai", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => request("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  signup: (body) => request("/api/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  getProfile: (userId) => request(`/api/profiles/${encodeURIComponent(userId)}`),
  searchProfile: (query) => request(`/api/profiles/search/${encodeURIComponent(query)}`),
  saveProfile: (userId, profile) => request(`/api/profiles/${encodeURIComponent(userId)}`, { method: "POST", body: JSON.stringify(profile) }),
  saveWork: (userId, work) => request(`/api/profiles/${encodeURIComponent(userId)}/save-work`, { method: "POST", body: JSON.stringify(work) }),
  getWorks: (userId) => request(`/api/profiles/${encodeURIComponent(userId)}/works`),
  solveProblem: (userId, problemId) => request(`/api/profiles/${encodeURIComponent(userId)}/solve`, { method: "POST", body: JSON.stringify({ problemId }) }),
  removeFriend: (userId, friendId) => request(`/api/profiles/${encodeURIComponent(userId)}/friends/${encodeURIComponent(friendId)}`, { method: "DELETE" })
};

// Export individual helpers for backward compatibility/flexibility
export const getProfile = api.getProfile;
export const saveProfile = api.saveProfile;
