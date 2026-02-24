const express = require("express");
const cors = require("cors");
const { generateChatReply } = require("./ai-service.cjs");

const AI_SERVER_PORT = Number(process.env.PKM_AI_SERVER_PORT || 11435);

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "pkm-ai-backend" });
});

app.post("/api/ai/chat", async (req, res) => {
  try {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];

    if (messages.length === 0) {
      return res.status(400).json({ error: "messages is required" });
    }

    const result = await generateChatReply({
      provider:
        typeof req.body?.provider === "string" ? req.body.provider : "ollama",
      model: typeof req.body?.model === "string" ? req.body.model : undefined,
      systemPrompt:
        typeof req.body?.systemPrompt === "string"
          ? req.body.systemPrompt
          : undefined,
      temperature:
        typeof req.body?.temperature === "number"
          ? req.body.temperature
          : undefined,
      maxTokens:
        typeof req.body?.maxTokens === "number"
          ? req.body.maxTokens
          : undefined,
      messages,
    });

    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI error";
    return res.status(500).json({ error: message });
  }
});

const server = app.listen(AI_SERVER_PORT, "127.0.0.1", () => {
  console.log(`[pkm-ai] listening on http://127.0.0.1:${AI_SERVER_PORT}`);
});

function shutdown() {
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
