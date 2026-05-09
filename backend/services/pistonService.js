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

const FALLBACK_URLS = [
  "https://piston.engineeringman.work/api/v2/execute",
  "https://emkc.org/api/v2/piston/execute"
].filter(Boolean);

export class PistonService {
  async run({ language, version, code, input }) {
    const resolved = resolveLanguage(language, version);
    const sourceCode = String(code ?? "").trim();
    const stdin = String(input ?? "");

    if (!sourceCode) {
      throw createCompilerError("EMPTY_CODE", "Code cannot be empty.", 400);
    }

    let lastError = null;
    
    for (const targetUrl of FALLBACK_URLS) {
      try {
        console.log(`[Compiler] Trying: ${targetUrl}`);

        const response = await fetch(targetUrl, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://emkc.org/",
            "Origin": "https://emkc.org"
          },
          body: JSON.stringify({
            language: resolved.pistonLanguage,
            version: resolved.version,
            files: [{ name: resolved.filename, content: sourceCode }],
            stdin
          })
        });

        if (response.ok) {
          const payload = await response.json();
          return formatExecutionResult(payload, resolved, Date.now());
        }
        
        console.warn(`[Compiler] ${targetUrl} failed with status: ${response.status}`);
      } catch (error) {
        lastError = error;
        console.warn(`[Compiler] ${targetUrl} error: ${error.message}`);
      }
    }

    throw createCompilerError(
      "COMPILER_UNAVAILABLE",
      `All compiler services are failing. Last error: ${lastError?.message || "Unknown"}`,
      503
    );
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