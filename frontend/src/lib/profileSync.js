const PROFILE_SYNC_EVENT = "codefora:profile-sync";
const PROFILE_SYNC_STORAGE_KEY = "codefora_profile_sync";
const CHANNEL_NAME = "codefora-profile";

function getChannel() {
  if (typeof window === "undefined" || typeof window.BroadcastChannel === "undefined") return null;
  if (!window.__codeforaProfileChannel) {
    window.__codeforaProfileChannel = new BroadcastChannel(CHANNEL_NAME);
  }
  return window.__codeforaProfileChannel;
}

export function publishProfileSync(profile = {}) {
  if (typeof window === "undefined") return;

  const payload = {
    uid: profile.uid || profile.userId || "",
    displayName: profile.displayName || "",
    emotionId: profile.emotionId || "",
    photoURL: profile.photoURL || "",
    community: profile.community || "",
    updatedAt: Date.now()
  };

  window.dispatchEvent(new CustomEvent(PROFILE_SYNC_EVENT, { detail: payload }));
  getChannel()?.postMessage(payload);
  try {
    localStorage.setItem(PROFILE_SYNC_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Cross-tab sync is helpful, but profile saving should not fail if storage is unavailable.
  }
}

export function subscribeProfileSync(callback) {
  if (typeof window === "undefined") return () => {};

  const handleLocalEvent = (event) => callback(event.detail || {});
  const channel = getChannel();
  const handleChannel = (event) => callback(event.data || {});
  const handleStorage = (event) => {
    if (event.key !== PROFILE_SYNC_STORAGE_KEY || !event.newValue) return;
    try {
      callback(JSON.parse(event.newValue));
    } catch {
      // Ignore malformed cross-tab payloads.
    }
  };

  window.addEventListener(PROFILE_SYNC_EVENT, handleLocalEvent);
  window.addEventListener("storage", handleStorage);
  if (channel) channel.addEventListener("message", handleChannel);

  return () => {
    window.removeEventListener(PROFILE_SYNC_EVENT, handleLocalEvent);
    window.removeEventListener("storage", handleStorage);
    if (channel) channel.removeEventListener("message", handleChannel);
  };
}
