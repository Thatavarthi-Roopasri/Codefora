const PISTON_EXECUTE_URL = process.env.PISTON_EXECUTE_URL || "http://localhost:2000/api/v2/execute";
const PISTON_AUTH_TOKEN = String(process.env.PISTON_AUTH_TOKEN || "").trim();
const PISTON_AUTH_SCHEME = String(process.env.PISTON_AUTH_SCHEME || "Bearer").trim() || "Bearer";

const LANGUAGE_CONFIG = {
  c: { pistonLanguage: "c", version: "10.2.0", filename: "main.c" },
  cpp: { pistonLanguage: "cpp", version: "10.2.0", filename: "main.cpp" },
  java: { pistonLanguage: "java", version: "15.0.2", filename: "Main.java" },
  javascript: { pistonLanguage: "javascript", version: "18.15.0", filename: "main.js" },
  typescript: { pistonLanguage: "typescript", version: "5.0.3", filename: "main.ts" },
  go: { pistonLanguage: "go", version: "1.16.2", filename: "main.go" },
  rust: { pistonLanguage: "rust", version: "1.68.2", filename: "main.rs" },
  python: { pistonLanguage: "python", version: "3.10.0", filename: "main.py" }
};

const LANGUAGE_ALIASES = {
  cplusplus: "cpp",
  "c++": "cpp",
  js: "javascript",
  ts: "typescript",
  py: "python",
  node: "javascript"
};

export class PistonService {
  async run({ language, version, code, input }) {
    const resolved = resolveLanguage(language, version);
    const sourceCode = String(code ?? "").trim();
    const stdin = String(input ?? "");

    if (!sourceCode) {
      throw createCompilerError("EMPTY_CODE", "Code cannot be empty.", 400);
    }

    const startedAt = Date.now();
    const controller = new AbortController();
    const timeoutMs = 20000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const targetUrl = PISTON_EXECUTE_URL.trim();
      console.log(`[Piston] Attempting execution at: ${targetUrl}`);

      const headers = { 
        "Content-Type": "application/json",
        "User-Agent": "Codefora-Compiler-Service"
      };
      if (PISTON_AUTH_TOKEN && PISTON_AUTH_TOKEN.length > 0) {
        headers.Authorization = `${PISTON_AUTH_SCHEME} ${PISTON_AUTH_TOKEN}`.trim();
      }

      const response = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          language: resolved.pistonLanguage,
          version: resolved.version,
          files: [{ name: resolved.filename, content: sourceCode }],
          stdin,
          compile_timeout: 3000,
          run_timeout: 3000
        }),
        signal: controller.signal
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw createCompilerError(
          "PISTON_ERROR",
          response.status === 401
            ? "Piston requires an authorization token. Configure PISTON_AUTH_TOKEN to enable compiler execution."
            : payload.message || payload.error || "Piston execution failed.",
          502,
          payload
        );
      }

      return formatExecutionResult(payload, resolved, startedAt);
    } catch (error) {
      console.error(`[Piston] Execution Error: ${error.message}`, error);
      
      if (error?.name === "AbortError" || error?.code === "UND_ERR_CONNECT_TIMEOUT") {
        throw createCompilerError("TIMEOUT", "Execution timed out.", 408);
      }

      if (error?.cause?.code === "ECONNREFUSED" || error?.code === "ECONNREFUSED" || error?.message?.includes("fetch failed")) {
        throw createCompilerError("PISTON_UNAVAILABLE", `Local compiler service is offline or unreachable. Error: ${error.message}`, 503);
      }

      if (error?.code === "EMPTY_CODE" || error?.code === "INVALID_LANGUAGE") {
        throw error;
      }

      if (error?.statusCode) {
        throw error;
      }

      throw createCompilerError("PISTON_UNAVAILABLE", error?.message || "Compiler service unavailable.", 502);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

function resolveLanguage(language, version) {
  const normalized = normalizeLanguage(language);
  const mapped = LANGUAGE_ALIASES[normalized] || normalized;
  const config = LANGUAGE_CONFIG[mapped];

  if (!config) {
    throw createCompilerError(
      "INVALID_LANGUAGE",
      `Unsupported language: ${String(language || "").trim() || "unknown"}`,
      400
    );
  }

  return {
    pistonLanguage: config.pistonLanguage,
    version: String(version || "").trim() || config.version,
    filename: config.filename
  };
}

function normalizeLanguage(language) {
  return String(language || "").trim().toLowerCase();
}

function formatExecutionResult(payload, resolved, startedAt) {
  const compile = payload.compile || {};
  const run = payload.run || {};
  const executionTime = Date.now() - startedAt;
  const compileErrors = normalizeText(compile.stderr || compile.output || payload.compile_output || "");
  const runtimeErrors = normalizeText(run.stderr || payload.stderr || "");
  const stdout = normalizeText(run.stdout || payload.stdout || "");
  const stderr = normalizeText(runtimeErrors || compileErrors || "");
  const executionOutput = normalizeText([
    compile.output,
    run.output,
    stdout,
    stderr
  ].filter(Boolean).join("\n"));

  return {
    stdout,
    stderr,
    compileErrors,
    runtimeErrors,
    output: executionOutput,
    executionOutput,
    executionTime,
    language: resolved.pistonLanguage,
    version: resolved.version,
    status: inferStatus(compile, run, compileErrors, runtimeErrors)
  };
}

function inferStatus(compile, run, compileErrors, runtimeErrors) {
  if (compileErrors) return "compilation_error";
  if (runtimeErrors) return "runtime_error";
  if (run?.code && run.code !== 0) return "runtime_error";
  if (compile?.code && compile.code !== 0) return "compilation_error";
  return "completed";
}

function normalizeText(value) {
  return String(value || "").trim();
}

function createCompilerError(code, message, statusCode, details) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  if (details) error.details = details;
  return error;
}