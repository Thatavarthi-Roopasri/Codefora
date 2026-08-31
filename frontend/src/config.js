const LOCAL_API_URL = "http://localhost:5000";

const configuredApiUrl = (import.meta.env.VITE_API_URL || LOCAL_API_URL)
  .split(",")
  .map((url) => url.trim())
  .filter((url) => url.includes("onrender.com") || url.includes("codefora.online") || url.includes("localhost") || url.includes("127.0.0.1"))
  .pop()
  ?.replace(/\/+$/, "") || LOCAL_API_URL;

export const API_URL =
  import.meta.env.DEV && import.meta.env.VITE_USE_REMOTE_API !== "true"
    ? LOCAL_API_URL
    : configuredApiUrl;
