import vm from "node:vm";

export class ExecutionService {
  async run({ file, code, input }) {
    if (!file || typeof code !== "string") throw new Error("file and code are required");
    if (file.endsWith(".js")) return this.runJavaScript(code, input || "");
    if (process.env.JUDGE0_URL && process.env.JUDGE0_KEY) return this.runWithJudge0(file, code, input || "");
    return {
      stdout: "",
      stderr: "Judge0 is not configured. Add JUDGE0_URL and JUDGE0_KEY to run this language.",
      status: "configuration_required"
    };
  }

  runJavaScript(code, input) {
    const logs = [];
    const sandbox = {
      input,
      console: {
        log: (...args) => logs.push(args.map(String).join(" ")),
        error: (...args) => logs.push(args.map(String).join(" "))
      }
    };
    try {
      vm.createContext(sandbox);
      vm.runInContext(code, sandbox, { timeout: 2000 });
      return { stdout: logs.join("\n"), stderr: "", status: "completed" };
    } catch (error) {
      return { stdout: logs.join("\n"), stderr: error.message, status: "error" };
    }
  }

  async runWithJudge0(file, code, input) {
    const headers = { "Content-Type": "application/json", "X-RapidAPI-Key": process.env.JUDGE0_KEY };
    if (process.env.JUDGE0_HOST) headers["X-RapidAPI-Host"] = process.env.JUDGE0_HOST;
    const submit = await fetch(`${process.env.JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
      method: "POST",
      headers,
      body: JSON.stringify({ source_code: code, stdin: input, language_id: languageId(file) })
    });
    const payload = await submit.json();
    if (!submit.ok) throw new Error(payload.message || "Judge0 execution failed");
    return { stdout: payload.stdout || "", stderr: payload.stderr || payload.compile_output || "", status: payload.status?.description || "completed" };
  }
}

function languageId(file) {
  if (file.endsWith(".java")) return 62;
  if (file.endsWith(".py")) return 71;
  if (file.endsWith(".cpp")) return 54;
  if (file.endsWith(".c")) return 50;
  return 63;
}
