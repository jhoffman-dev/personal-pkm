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
  async function* streamOllamaResponse(response) {
    if (!response.body) {
      throw new Error("Ollama streaming response body is unavailable");
    }

    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }

        let parsed;
        try {
          parsed = JSON.parse(trimmed);
        } catch {
          continue;
        }

        const delta = parsed?.message?.content;
        const doneFlag = Boolean(parsed?.done);

        if (typeof delta === "string" && delta.length > 0) {
          yield {
            delta,
            done: false,
          };
        }

        if (doneFlag) {
          yield {
            done: true,
          };
        }
      }
    }

    const trailing = buffer.trim();
    if (!trailing) {
      return;
    }

    try {
      const parsed = JSON.parse(trailing);
      const delta = parsed?.message?.content;
      const doneFlag = Boolean(parsed?.done);

      if (typeof delta === "string" && delta.length > 0) {
        yield {
          delta,
          done: false,
        };
      }

      if (doneFlag) {
        yield {
          done: true,
        };
      }
    } catch {
      // Ignore malformed trailing chunk.
    }
  }

  async function listModels() {
    const response = await fetch(`${DEFAULT_OLLAMA_BASE_URL}/api/tags`, {
      method: "GET",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Ollama model listing failed (${response.status}): ${text}`,
      );
    }

    const data = await response.json();
    const rawModels = Array.isArray(data?.models) ? data.models : [];
    const modelNames = rawModels
      .map((entry) => {
        if (typeof entry?.name === "string") {
          return entry.name.trim();
        }

        if (typeof entry?.model === "string") {
          return entry.model.trim();
        }

        return "";
      })
      .filter(Boolean);

    const deduped = Array.from(new Set(modelNames));

    if (deduped.length === 0) {
      return [DEFAULT_OLLAMA_MODEL];
    }

    return deduped;
  }

  return {
    id: "ollama",
    listModels,
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
    async *generateChatStream(messages, options = {}) {
      const model = options.model || DEFAULT_OLLAMA_MODEL;
      const payload = {
        model,
        stream: true,
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

      yield* streamOllamaResponse(response);
    },
  };
}

module.exports = {
  createOllamaProvider,
};
