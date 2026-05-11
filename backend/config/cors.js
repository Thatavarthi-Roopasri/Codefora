export function allowedOrigins() {
  const configured = (process.env.CLIENT_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [
    ...configured,
    "https://codefora.online",
    "https://www.codefora.online",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:3003"
  ];
}

export function corsOrigin(origin, callback) {
  if (!origin) return callback(null, true);
  if (allowedOrigins().includes(origin)) return callback(null, true);
  return callback(new Error("Not allowed by CORS"));
}
