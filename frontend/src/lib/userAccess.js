export function isGuestUser(user) {
  return !user || user.providerId === "manual" || String(user.uid || "").startsWith("guest-");
}
