const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 20;

export function createCompilerController(pistonService, options = {}) {
  const windowMs = Number(options.windowMs || DEFAULT_WINDOW_MS);
  const maxRequests = Number(options.maxRequests || DEFAULT_MAX_REQUESTS);
  const buckets = new Map();

  function rateLimit(request, response, next) {
    // Lightweight in-memory limiter to keep the compiler endpoint usable in production without extra deps.
    const key = request.ip || request.headers["x-forwarded-for"] || "anonymous";
    const now = Date.now();
    const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

    if (bucket.resetAt <= now) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > maxRequests) {
      return response.status(429).json({
        error: "Too many compiler requests. Please try again shortly.",
        status: "rate_limited",
        retryAfterMs: Math.max(0, bucket.resetAt - now)
      });
    }

    next();
  }

  async function run(request, response) {
    try {
      const body = request.body || {};
      const language = body.language;
      const code = body.code;

      if (!language || !String(language).trim()) {
        return response.status(400).json({ error: "language is required", status: "invalid_request" });
      }

      if (code == null || String(code).trim() === "") {
        return response.status(400).json({ error: "code is required", status: "invalid_request" });
      }

      const result = await pistonService.run({
        language,
        version: body.version,
        code,
        input: body.input
      });

      response.json(result);
    } catch (error) {
      const statusCode = error?.statusCode || (error?.code === "INVALID_LANGUAGE" ? 400 : 500);
      response.status(statusCode).json({
        error: error?.message || "Compiler execution failed",
        code: error?.code || "COMPILER_ERROR",
        status: error?.code === "TIMEOUT" ? "timeout" : "error",
        details: error?.details || undefined
      });
    }
  }

  return { rateLimit, run };
}