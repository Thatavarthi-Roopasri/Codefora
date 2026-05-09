export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000")
  .split(",")
  .map(url => url.trim())
  .filter(url => url.includes("onrender.com") || url.includes("localhost") || url.includes("127.0.0.1"))
  .pop() || "http://localhost:5000";
