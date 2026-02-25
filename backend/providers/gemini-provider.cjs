const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_API_BASE =
  process.env.GEMINI_API_BASE ||
  "https://generativelanguage.googleapis.com/v1beta";

function mapMessages(messages) {
  const contents = [];

  messages.forEach((message) => {
    const text =
      typeof message?.content === "string" ? message.content.trim() : "";
    if (!text) {
      return;
    }

    const role = message.role === "assistant" ? "model" : "user";
    contents.push({
      role,
      parts: [{ text }],
    });
  });

  return contents;
}

function readReplyText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

function createGeminiProvider() {
  return {
    id: "gemini",
    async generateChat(messages, options = {}) {
      const runtimeKey =
        typeof options.googleAiStudioApiKey === "string"
          ? options.googleAiStudioApiKey.trim()
          : "";
      const apiKey = runtimeKey || process.env.GOOGLE_AI_STUDIO_API_KEY;
      if (!apiKey) {
        throw new Error(
          "Gemini provider is not configured. Set GOOGLE_AI_STUDIO_API_KEY in the environment.",
        );
      }

      const model = options.model || DEFAULT_GEMINI_MODEL;
      const endpoint = `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const payload = {
        contents: mapMessages(messages),
        systemInstruction:
          typeof options.systemPrompt === "string" &&
          options.systemPrompt.trim()
            ? {
                parts: [{ text: options.systemPrompt.trim() }],
              }
            : undefined,
        generationConfig: {
          temperature:
            typeof options.temperature === "number" ? options.temperature : 0.2,
          maxOutputTokens:
            typeof options.maxTokens === "number"
              ? options.maxTokens
              : undefined,
        },
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Gemini request failed (${response.status}): ${text}`);
      }

      const data = await response.json();
      const reply = readReplyText(data);

      if (!reply) {
        throw new Error("Gemini response did not include assistant content");
      }

      return reply;
    },
  };
}

module.exports = {
  createGeminiProvider,
};
