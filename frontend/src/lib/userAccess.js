export function isGuestUser(user) {
  return !user || String(user.uid || "").startsWith("guest-");
}
