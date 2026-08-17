const PISTON_EXECUTE_URL = process.env.PISTON_EXECUTE_URL || "http://localhost:2000/api/v2/execute";
const PISTON_AUTH_TOKEN = String(process.env.PISTON_AUTH_TOKEN || "").trim();
const PISTON_AUTH_SCHEME = String(process.env.PISTON_AUTH_SCHEME || "Bearer").trim() || "Bearer";

const JUDGE0_URL = "https://ce.judge0.com/submissions?base64_encoded=true&wait=true";

// Mapping Piston language names to Judge0 language IDs
const LANGUAGE_MAP = {
  javascript: 63,
  typescript: 74,
  python: 71,
  java: 62,
  cpp: 54,
  c: 50,
  go: 60,
  rust: 73
};

export class PistonService {
  async run({ language, code, input, timeLimitMs }) {
    const sourceCode = String(code ?? "").trim();
    const stdin = String(input ?? "");
    const langId = LANGUAGE_MAP[language.toLowerCase()] || 63; // Default to JS

    if (!sourceCode) {
      throw createCompilerError("EMPTY_CODE", "Code cannot be empty.", 400);
    }

    const requestTimeoutMs = Math.max(10_000, Number(timeLimitMs || 0) + 5_000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

    try {
      console.log(`[Compiler] Sending to Judge0 (ID: ${langId})...`);

      const response = await fetch(JUDGE0_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          source_code: Buffer.from(sourceCode).toString('base64'),
          language_id: langId,
          stdin: Buffer.from(stdin).toString('base64'),
          ...(timeLimitMs ? {
            cpu_time_limit: Math.max(0.25, Number(timeLimitMs) / 1000),
            wall_time_limit: Math.max(1, Number(timeLimitMs) / 1000 + 0.5)
          } : {})
        })
      });

      if (!response.ok) {
        throw new Error(`Judge0 failed with status: ${response.status}`);
      }

      const result = await response.json();

      const stdoutDecoded = result.stdout ? Buffer.from(result.stdout, 'base64').toString('utf8') : "";
      const stderrDecoded = result.stderr ? Buffer.from(result.stderr, 'base64').toString('utf8') : 
                            (result.compile_output ? Buffer.from(result.compile_output, 'base64').toString('utf8') : "");

      const judgeStatus = result.status?.description || "Unknown status";
      const accepted = judgeStatus.toLowerCase() === "accepted";
      return {
        stdout: stdoutDecoded,
        stderr: stderrDecoded,
        output: stdoutDecoded + stderrDecoded,
        executionTime: Math.floor(parseFloat(result.time || 0) * 1000),
        status: accepted ? "success" : "error",
        judgeStatus
      };
    } catch (error) {
      if (error?.name === "AbortError") {
        throw createCompilerError("TIMEOUT", "Execution exceeded the allowed time.", 408);
      }
      console.error("[Compiler] Judge0 Error:", error.message);
      throw createCompilerError("COMPILER_UNAVAILABLE", `Network issue, please improve your internet. (${error.message})`, 503);
    } finally {
      clearTimeout(timeout);
    }
  }
}

function createCompilerError(code, message, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}
