import { API_URL } from "../config";

async function request(path, options) {
  const adminToken = localStorage.getItem("codefora_admin_token");
  const headers = { 
    "Content-Type": "application/json", 
    ...(options?.headers || {}) 
  };
  
  if (adminToken) {
    headers["x-admin-token"] = adminToken;
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
  saveProfile: (userId, profile) => request(`/api/profiles/${encodeURIComponent(userId)}`, { method: "POST", body: JSON.stringify(profile) }),
  saveWork: (userId, work) => request(`/api/profiles/${encodeURIComponent(userId)}/save-work`, { method: "POST", body: JSON.stringify(work) }),
  getWorks: (userId) => request(`/api/profiles/${encodeURIComponent(userId)}/works`),
  solveProblem: (userId, problemId) => request(`/api/profiles/${encodeURIComponent(userId)}/solve`, { method: "POST", body: JSON.stringify({ problemId }) })
};

// Export individual helpers for backward compatibility/flexibility
export const getProfile = api.getProfile;
export const saveProfile = api.saveProfile;
