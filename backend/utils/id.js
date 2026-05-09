export function cryptoId() {
  return Math.random().toString(36).slice(2, 9);
}

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 28);
}
