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
  async run({ language, code, input }) {
    const sourceCode = String(code ?? "").trim();
    const stdin = String(input ?? "");
    const langId = LANGUAGE_MAP[language.toLowerCase()] || 63; // Default to JS

    if (!sourceCode) {
      throw createCompilerError("EMPTY_CODE", "Code cannot be empty.", 400);
    }

    try {
      console.log(`[Compiler] Sending to Judge0 (ID: ${langId})...`);

      const response = await fetch(JUDGE0_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: Buffer.from(sourceCode).toString('base64'),
          language_id: langId,
          stdin: Buffer.from(stdin).toString('base64')
        })
      });

      if (!response.ok) {
        throw new Error(`Judge0 failed with status: ${response.status}`);
      }

      const result = await response.json();

      const stdoutDecoded = result.stdout ? Buffer.from(result.stdout, 'base64').toString('utf8') : "";
      const stderrDecoded = result.stderr ? Buffer.from(result.stderr, 'base64').toString('utf8') : 
                            (result.compile_output ? Buffer.from(result.compile_output, 'base64').toString('utf8') : "");

      return {
        stdout: stdoutDecoded,
        stderr: stderrDecoded,
        output: stdoutDecoded + stderrDecoded,
        executionTime: Math.floor(parseFloat(result.time || 0) * 1000),
        status: result.status?.description?.toLowerCase()?.includes("accepted") ? "success" : "error"
      };
    } catch (error) {
      console.error("[Compiler] Judge0 Error:", error.message);
      throw createCompilerError("COMPILER_UNAVAILABLE", `Network issue, please improve your internet. (${error.message})`, 503);
    }
  }
}

function createCompilerError(code, message, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}