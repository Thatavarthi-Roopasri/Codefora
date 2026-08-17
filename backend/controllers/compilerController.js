const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 150;

export function createCompilerController(pistonService, problemJudgeService, submissionService, options = {}) {
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
      const statusCode = error?.statusCode || error?.status || (error?.code === "INVALID_LANGUAGE" ? 400 : 500);
      response.status(statusCode).json({
        error: error?.message || "Compiler execution failed",
        code: error?.code || "COMPILER_ERROR",
        status: error?.code === "TIMEOUT" ? "timeout" : "error",
        details: error?.details || undefined
      });
    }
  }

  async function submit(request, response) {
    try {
      const body = request.body || {};
      if (!body.problemId) return response.status(400).json({ error: "problemId is required", status: "invalid_request" });
      if (!body.language || !String(body.language).trim()) return response.status(400).json({ error: "language is required", status: "invalid_request" });
      if (body.code == null || String(body.code).trim() === "") return response.status(400).json({ error: "code is required", status: "invalid_request" });

      const result = await problemJudgeService.judge({
        problemId: body.problemId,
        language: body.language,
        code: body.code
      });

      if (submissionService) {
        submissionService.record({
          userId: body.userId,
          problemId: body.problemId,
          language: body.language,
          ...result
        }).catch((recordError) => console.warn("Submission record failed:", recordError.message));
      }

      response.json(result);
    } catch (error) {
      response.status(error?.status || 500).json({
        error: error?.message || "Submission could not be judged.",
        status: "error"
      });
    }
  }

  return { rateLimit, run, submit };
}
