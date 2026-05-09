export function saveUsername(username) {
  localStorage.setItem("codefora_username", username.trim() || "Guest");
}

export function getUsername() {
  return localStorage.getItem("codefora_username") || "";
}

export function saveHostToken(roomId, hostToken) {
  const hostTokens = JSON.parse(localStorage.getItem("codefora_host_tokens") || "{}");
  hostTokens[roomId] = hostToken;
  localStorage.setItem("codefora_host_tokens", JSON.stringify(hostTokens));
}

export function getHostToken(roomId) {
  return JSON.parse(localStorage.getItem("codefora_host_tokens") || "{}")[roomId];
}

export function saveInviteCode(roomId, inviteCode) {
  if (inviteCode) localStorage.setItem(`codefora_invite_${roomId}`, String(inviteCode).replace(/\s+/g, "").trim().toUpperCase());
}

export function getInviteCode(roomId) {
  return localStorage.getItem(`codefora_invite_${roomId}`);
}

const PROFILE_STORAGE_KEY = "codefora_profile";

export function getProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveProfile(profile) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile || {}));
}
