import { GoogleGenerativeAI } from "@google/generative-ai";
import { createFirestore } from "../config/firebase.js";
import { CODEFORA_KNOWLEDGE_BASE } from "../config/knowledgeBase.js";

const db = createFirestore();

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
      const page = context?.page || "";
      if (page !== "Problems" && page !== "Room") {
        return await askCodeforaAI(prompt, context, code, file, context.language);
      }

      if (isCodeforaQuestion(prompt)) {
        return await askCodeforaAI(prompt, context, code, file, context.language);
      }

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

function isCodeforaQuestion(prompt) {
  const text = prompt.toLowerCase();
  
  // If it's heavily coding-focused, bypass unless "codefora" is explicitly mentioned
  if (/debug|error|compile|syntax|bug|c\+\+|java|python|javascript|algorithm|dsa|time complexity|space complexity/i.test(text)) {
    if (!text.includes("codefora")) return false;
  }
  
  const codeforaKeywords = [
    "codefora", "rooms", "room", "platform", "navigate", "navigation", 
    "collaborate", "collaboration", "profile", "profiles", "friend", 
    "friends", "contest", "contests", "war room", "war rooms"
  ];
  
  for (const kw of codeforaKeywords) {
    const regex = new RegExp(`\\b${kw}\\b`, "i");
    if (regex.test(text)) return true;
  }
  return false;
}

async function askCodeforaAI(userMessage, context = {}, code = "", file = "", language = "") {
  const page = context.page;
  const loraPrompt = page 
    ? `[System Note: The user is currently on the '${page}' page.]\n${userMessage}`
    : userMessage;

  // 1. Fetch raw facts from LoRA
  let rawLoraText = "";
  try {
    const response = await fetch(
      "https://roopasri06-codefora-lora-api.hf.space/generate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: loraPrompt })
      }
    );
    if (!response.ok) throw new Error("LoRA API failed");
    const data = await response.json();
    rawLoraText = data.response || "No response";
  } catch (error) {
    console.error("LoRA Error:", error);
    rawLoraText = "I couldn't reach the Codefora knowledge base right now.";
  }

  // 2. If Groq is missing, fallback to raw LoRA
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return { suggestion: rawLoraText, mode: "codefora-lora-raw" };
  }

  // 3. Chain to Groq for beautiful formatting and feedback analysis
  const systemPrompt = `You are a cute, friendly, and helpful AI assistant for the Codefora platform.
Codefora is a collaborative competitive programming platform where users can solve problems together in real-time rooms.
The user is currently on the "${page || "Platform"}" page.
${file ? `The user's active file/problem is: ${file}\n` : ""}
${language ? `The user is programming in: ${language}\n` : ""}
${code ? `The user's current code is:\n\`\`\`${language}\n${code}\n\`\`\`\n` : ""}
The user asked: "${userMessage}"

${CODEFORA_KNOWLEDGE_BASE}

Our internal knowledge base (LoRA) provided this raw answer:
"${rawLoraText}"

Your Job:
1. BEST FRIEND PERSONA: Speak to the user like they are your absolute best friend! Be extremely friendly, close, informal, and supportive ("Hey man!", "Bro!", "I got you!"). Do not sound like a robotic corporate assistant.
2. CLARIFICATION RULE: If the user's request is vague or you are confused about what they want, proactively ask them to clarify! (e.g., "Can you please specify what exactly you're trying to ask, bro?").
3. ACCURATE SITE KNOWLEDGE: NEVER hallucinate or invent generic website features (like "New user registration", "Code review", etc.). You MUST know exactly what is on the site based on the knowledge base. For example, if they ask how to change their profile picture, tell them: "Tap on your Profile icon in the top navbar to go to the Profile page, and you'll find the settings there!" Know exactly where things are positioned.
4. IMPORTANT: Do NOT use markdown formatting like **bold** or ## headers, because our frontend does not have a markdown parser. Use clean spacing and line breaks instead.
5. SOCRATIC TUTOR RULE: If the user provides code in the context and asks for help debugging, ONLY provide hints and point out the flawed area. DO NOT write the corrected code for them.
6. DOM NAVIGATION RULE (MANDATORY): If the user asks to navigate somewhere, asks "where is X?", "show me X", or "how do I find X", you MUST return "action": "highlight" and the exact CSS selector from the Knowledge Base in "targetSelector". You MUST ALSO provide a short text reply saying "Here it is!" or similar. DO NOT just explain where it is with text if a selector exists.
7. Analyze the user's intent: Are they frustrated, reporting a bug, or requesting a feature? If so, we will automatically submit this to our feedback system.

Respond STRICTLY with a JSON object in this format:
{
  "reply": "Your beautifully formatted plain-text response here (with line breaks)",
  "action": "highlight" or null,
  "targetSelector": ".css-class-to-highlight" or null,
  "isFeedback": true or false,
  "feedbackType": "feature", "bug", or "frustration" (or null if not feedback),
  "summary": "A 1-sentence summary of their feedback/issue (or null)"
}`;

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
        messages: [{ role: "system", content: systemPrompt }],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    if (!groqRes.ok) throw new Error("Groq analysis failed");
    
    const groqPayload = await groqRes.json();
    const rawContent = groqPayload.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(rawContent);

    let finalReply = parsed.reply || rawLoraText;

    // 4. Handle Automated Feedback
    if (parsed.isFeedback && db) {
      finalReply += "\n\n*(P.S. I noticed you might be having trouble or suggesting a feature. I have automatically sent this to the Codefora team as feedback!)*";
      
      await db.collection("feedback").add({
        username: context.username || "AI Auto-Feedback",
        message: `[Auto-Submitted via AI Chat]\nSummary: ${parsed.summary}\nOriginal: "${userMessage}"`,
        type: parsed.feedbackType || "general",
        rating: 0,
        createdAt: Date.now()
      }).catch(err => console.error("Auto-feedback save error:", err));
    }

    return { 
      suggestion: finalReply,
      action: parsed.action || null,
      targetSelector: parsed.targetSelector || null,
      mode: "codefora-lora-groq"
    };
  } catch (error) {
    console.error("Groq Chain Error:", error);
    // Fallback to raw LoRA if Groq fails
    return {
      suggestion: rawLoraText,
      mode: "codefora-lora-raw-fallback"
    };
  }
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
