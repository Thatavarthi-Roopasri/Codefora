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
  let changed = false;

  for (const key of CODEFORA_SESSION_KEYS) {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key);
      changed = true;
    }
  }

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key && CODEFORA_SESSION_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      localStorage.removeItem(key);
      changed = true;
    }
  }

  if (changed) window.dispatchEvent(new Event("codefora:session-changed"));
}

export function saveCodeforaSession({ uid, displayName, community, role }) {
  if (typeof window === "undefined") return;
  let changed = false;
  const save = (key, value) => {
    if (value && localStorage.getItem(key) !== value) {
      localStorage.setItem(key, value);
      changed = true;
    }
  };

  save("codefora_user_id", uid);
  save("codefora_username", displayName);
  save("codefora_community", community);
  save("codefora_role", role);
  if (changed) window.dispatchEvent(new Event("codefora:session-changed"));
}

export function isLocalIdentityAllowed() {
  return import.meta.env.DEV;
}
