const DEFAULT_GROK_URL = "https://api.x.ai/v1/chat/completions";
const DEFAULT_GROK_MODEL = "grok-4.6";
const REQUEST_TIMEOUT_MS = 8_000;

const ANSWERS = new Set(["A", "B", "C", "D"]);

export function isGrokQuestionGenerationConfigured(env = process.env) {
  return Boolean(String(env.GROK_API_KEY || env.XAI_API_KEY || "").trim());
}
/**
 * Generate a validated MCQ set through xAI's OpenAI-compatible chat API.
 * Any missing key, timeout, provider error, or malformed response returns null
 * so callers can use the deterministic in-repo question bank.
 */
export async function generateGrokMcqQuestions({ topic, count, difficulty }, env = process.env) {
  const apiKey = String(env.GROK_API_KEY || env.XAI_API_KEY || "").trim();
  if (!apiKey) return null;

  const requestedCount = Math.max(5, Math.min(Number(count) || 5, 15));
  const requestedTopic = String(topic || "Mixed Web Development").trim() || "Mixed Web Development";
  const requestedDifficulty = String(difficulty || "Medium").trim() || "Medium";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(String(env.GROK_API_URL || DEFAULT_GROK_URL), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: env.GROK_MODEL || DEFAULT_GROK_MODEL,
        temperature: 0.35,
        max_tokens: Math.min(5000, requestedCount * 260),
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You create accurate, self-contained multiple-choice questions for a timed coding battle. Return only valid JSON."
          },
          {
            role: "user",
            content: [
              `Generate exactly ${requestedCount} ${requestedTopic} questions at ${requestedDifficulty} difficulty.`,
              "Each question must have exactly four plausible options and exactly one correct option.",
              "Use this JSON shape: {\"questions\":[{\"id\":\"short-stable-id\",\"prompt\":\"question\",\"options\":[\"A\",\"B\",\"C\",\"D\"],\"answer\":\"A\"}].",
              "The answer field must be one of A, B, C, or D and must match the option at that position.",
              "Do not include markdown, explanations, duplicate questions, or an answer key outside each question."
            ].join(" ")
          }
        ]
      })
    });

    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    const content = payload?.choices?.[0]?.message?.content;
    const parsed = parseJsonContent(content);
    return validateQuestions(parsed?.questions, requestedCount);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function parseJsonContent(content) {
  if (Array.isArray(content)) {
    content = content.map(part => typeof part === "string" ? part : part?.text || "").join("");
  }
  if (typeof content !== "string") return null;
  const trimmed = content.trim();
  const withoutFence = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(withoutFence);
  } catch {
    return null;
  }
}

function validateQuestions(questions, requestedCount) {
  if (!Array.isArray(questions) || questions.length < requestedCount) return null;
  const seen = new Set();
  const validated = questions.slice(0, requestedCount).map((question, index) => {
    const id = String(question?.id || `grok-${index + 1}`).trim().slice(0, 80);
    const prompt = String(question?.prompt || "").trim().slice(0, 1200);
    const options = Array.isArray(question?.options)
      ? question.options.map(option => String(option || "").trim().slice(0, 400))
      : [];
    const answer = String(question?.answer || "").trim().toUpperCase();
    if (!id || seen.has(id) || !prompt || options.length !== 4 || options.some(option => !option) || !ANSWERS.has(answer)) return null;
    seen.add(id);
    return { id, prompt, options, answer };
  });
  return validated.every(Boolean) ? validated : null;
}
