const DEFAULT_OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3:8b";

function mapMessages(messages, systemPrompt) {
  const next = [];

  if (systemPrompt && systemPrompt.trim()) {
    next.push({ role: "system", content: systemPrompt.trim() });
  }

  messages.forEach((message) => {
    if (!message?.content?.trim()) {
      return;
    }

    if (
      message.role === "system" ||
      message.role === "assistant" ||
      message.role === "user"
    ) {
      next.push({ role: message.role, content: message.content.trim() });
      return;
    }

    next.push({ role: "user", content: message.content.trim() });
  });

  return next;
}

function createOllamaProvider() {
  return {
    id: "ollama",
    async generateChat(messages, options = {}) {
      const model = options.model || DEFAULT_OLLAMA_MODEL;
      const payload = {
        model,
        stream: false,
        messages: mapMessages(messages, options.systemPrompt),
        options: {
          temperature:
            typeof options.temperature === "number" ? options.temperature : 0.2,
          num_predict:
            typeof options.maxTokens === "number"
              ? options.maxTokens
              : undefined,
        },
      };

      const response = await fetch(`${DEFAULT_OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Ollama request failed (${response.status}): ${text}`);
      }

      const data = await response.json();
      const content = data?.message?.content;

      if (typeof content !== "string") {
        throw new Error("Ollama response did not include assistant content");
      }

      return content;
    },
  };
}

module.exports = {
  createOllamaProvider,
};
