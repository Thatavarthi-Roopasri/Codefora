import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_OLLAMA_URL = "http://localhost:11434";
const DEFAULT_OLLAMA_MODEL = "llama3.2:1b";
const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";
const DEFAULT_GEMINI_MODEL = "gemini-3-flash";

export class AiService {
  async ask({ prompt, file, code, context }) {
    if (!prompt) throw new Error("prompt is required");

    const provider = resolveProvider();
    const messages = buildMessages({ prompt, file, code, context });

    try {
      if (provider === "groq") return await askGroq(messages);
      if (provider === "gemini") return await askGemini(messages);
      return await askOllama(messages);
    } catch (error) {
      console.error(`AI Service ${provider} Error:`, error);
      return {
        suggestion: `AI Assistant could not reach ${provider}: ${error.message}. Check the backend .env and try again.`,
        mode: "error"
      };
    }
  }
}

function resolveProvider() {
  const configured = String(process.env.AI_PROVIDER || "").trim().toLowerCase();
  if (["ollama", "groq", "gemini"].includes(configured)) return configured;
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return "ollama";
}

function buildMessages({ prompt, file, code, context }) {
  const system = [
    "You are Codefora's coding assistant inside a collaborative programming room.",
    "Answer using the supplied room, editor, file, console, user, and chat context as the user's current screen.",
    "If the user asks what is happening on screen, summarize only what the supplied context shows.",
    "Explain fixes clearly, help debug code, and keep answers practical and concise."
  ].join(" ");

  const screenContext = formatScreenContext(context);

  const user = `User Question: ${prompt}

Screen Context:
${screenContext}

Active File: ${file || "active file"}

Current Code:
\`\`\`
${truncate(code || "", 12000)}
\`\`\``;

  return [
    { role: "system", content: system },
    { role: "user", content: user }
  ];
}

function formatScreenContext(context = {}) {
  if (!context || typeof context !== "object") return "No extra screen context was supplied.";

  const room = context.room
    ? `Room: ${context.room.name || context.room.id || "active room"}${context.room.hostName ? `, host: ${context.room.hostName}` : ""}`
    : "Room: unknown";
  const activeFile = context.activeFile
    ? `Active file: ${context.activeFile.name || "unknown"}${context.activeFile.language ? ` (${context.activeFile.language})` : ""}`
    : "Active file: unknown";
  const files = Array.isArray(context.files) && context.files.length
    ? context.files.map((item) => `${item.isActive ? "*" : "-"} ${item.name || "untitled"}${item.language ? ` (${item.language})` : ""}, ${item.characters || 0} chars`).join("\n")
    : "No file list supplied.";
  const users = Array.isArray(context.users) && context.users.length
    ? context.users.map((user) => `${user.name || "User"} (${user.role || "Member"}${user.speaking ? ", speaking" : ""}${user.mic ? ", mic on" : ""})`).join(", ")
    : "No users supplied.";
  const recentRoomChat = formatMessages(context.recentRoomChat, "user");
  const recentAiChat = formatMessages(context.recentAiChat, "role");

  return [
    `Page: ${context.page || "Room"}`,
    room,
    formatProblemContext(context.selectedProblem, context.selectedLanguage),
    activeFile,
    `Run target: ${context.runFile || "not selected"}`,
    `Compiler status: ${context.compilerStatus || "unknown"}`,
    `Console output:\n${truncate(context.consoleOutput || "No console output.", 4000)}`,
    `Files:\n${files}`,
    `Visible users: ${users}`,
    `Recent room chat:\n${recentRoomChat}`,
    `Recent AI chat:\n${recentAiChat}`
  ].join("\n\n");
}

function formatProblemContext(problem, language) {
  if (!problem || typeof problem !== "object") return "Problem context: none.";
  if (problem.mode === "problem library") {
    const visible = Array.isArray(problem.visibleProblems) && problem.visibleProblems.length
      ? problem.visibleProblems.map((item) => `- ${item.title} (${item.difficulty}) ${Array.isArray(item.tags) ? item.tags.join(", ") : ""}`).join("\n")
      : "No visible problems supplied.";
    return `Problem library:\n${visible}`;
  }

  const tests = Array.isArray(problem.sampleTests) && problem.sampleTests.length
    ? problem.sampleTests.map((test, index) => `Sample ${index + 1}\nInput:\n${test.input}\nOutput:\n${test.output}`).join("\n\n")
    : "No sample tests supplied.";
  const constraints = Array.isArray(problem.constraints) && problem.constraints.length
    ? problem.constraints.join("\n")
    : "No constraints supplied.";

  return [
    `Selected problem: ${problem.title || "unknown"}${problem.difficulty ? ` (${problem.difficulty})` : ""}`,
    `Selected language: ${language || "unknown"}`,
    `Statement:\n${truncate(problem.statement || "", 3000)}`,
    `Constraints:\n${constraints}`,
    `Sample tests:\n${tests}`
  ].join("\n\n");
}

function formatMessages(messages, nameKey) {
  if (!Array.isArray(messages) || !messages.length) return "No recent messages.";
  return messages
    .slice(-8)
    .map((message) => `${message[nameKey] || "user"}: ${truncate(message.text || "", 500)}`)
    .join("\n");
}

function truncate(value, maxLength) {
  const text = String(value || "");
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n...[truncated ${text.length - maxLength} characters]`;
}

async function askOllama(messages) {
  const baseUrl = String(process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_URL).replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Ollama request failed with ${response.status}`);
  }

  return {
    suggestion: payload.message?.content || payload.response || "No suggestion returned.",
    mode: `ollama:${model}`
  };
}

async function askGroq(messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is missing");

  const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_completion_tokens: 900
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || `Groq request failed with ${response.status}`);
  }

  return {
    suggestion: payload.choices?.[0]?.message?.content || "No suggestion returned.",
    mode: `groq:${model}`
  };
}

async function askGemini(messages) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing");

  const modelName = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });
  const fullPrompt = messages.map((message) => `${message.role.toUpperCase()}:\n${message.content}`).join("\n\n");
  const result = await model.generateContent(fullPrompt);
  const response = await result.response;

  return {
    suggestion: response.text() || "No suggestion returned.",
    mode: `gemini:${modelName}`
  };
}
