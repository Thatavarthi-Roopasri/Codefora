const CODEFORA_SESSION_KEYS = [
  "codefora_user_id",
  "codefora_username",
  "codefora_role",
  "codefora_community",
  "codefora_host_tokens",
  "current_code",
  "current_language",
  "current_problem_title"
];

const CODEFORA_SESSION_PREFIXES = [
  "codefora_invite_",
  "codefora_profile_"
];

export function clearCodeforaSession() {
  if (typeof window === "undefined") return;

  for (const key of CODEFORA_SESSION_KEYS) {
    localStorage.removeItem(key);
  }

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key && CODEFORA_SESSION_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      localStorage.removeItem(key);
    }
  }
}

export function saveCodeforaSession({ uid, displayName, community, role }) {
  if (typeof window === "undefined") return;

  if (uid) localStorage.setItem("codefora_user_id", uid);
  if (displayName) localStorage.setItem("codefora_username", displayName);
  if (community) localStorage.setItem("codefora_community", community);
  if (role) localStorage.setItem("codefora_role", role);
}

export function isLocalIdentityAllowed() {
  return import.meta.env.DEV;
}
