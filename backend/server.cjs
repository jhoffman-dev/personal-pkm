const express = require("express");
const cors = require("cors");
const {
  createAssistantChatUseCases,
} = require("./application/assistant-chat-use-cases.cjs");
const { createAiGateway } = require("./infrastructure/ai/ai-gateway.cjs");
const {
  createFirestoreAssistantChatRepository,
} = require("./infrastructure/storage/firestore-assistant-chat-repository.cjs");

const AI_SERVER_PORT = Number(process.env.PKM_AI_SERVER_PORT || 11435);

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const assistantChatUseCases = createAssistantChatUseCases({
  aiGateway: createAiGateway(),
  chatRepository: createFirestoreAssistantChatRepository(),
  logger: console,
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "pkm-ai-backend" });
});

function buildChatRequest(body) {
  return {
    provider: typeof body?.provider === "string" ? body.provider : "ollama",
    model: typeof body?.model === "string" ? body.model : undefined,
    googleAiStudioApiKey:
      typeof body?.googleAiStudioApiKey === "string"
        ? body.googleAiStudioApiKey
        : undefined,
    systemPrompt:
      typeof body?.systemPrompt === "string" ? body.systemPrompt : undefined,
    temperature:
      typeof body?.temperature === "number" ? body.temperature : undefined,
    maxTokens: typeof body?.maxTokens === "number" ? body.maxTokens : undefined,
    authToken: typeof body?.authToken === "string" ? body.authToken : undefined,
    userId: typeof body?.userId === "string" ? body.userId : undefined,
    conversationId:
      typeof body?.conversationId === "string"
        ? body.conversationId
        : undefined,
    conversationTitle:
      typeof body?.conversationTitle === "string"
        ? body.conversationTitle
        : undefined,
  };
}

function extractBearerToken(request) {
  const authHeader = request.header("authorization");
  if (typeof authHeader !== "string") {
    return null;
  }

  const trimmed = authHeader.trim();
  if (!trimmed.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return trimmed.slice(7).trim() || null;
}

app.get("/api/ai/chats", async (req, res) => {
  try {
    const authToken =
      extractBearerToken(req) ||
      (typeof req.query?.authToken === "string" ? req.query.authToken : null);
    const userId =
      typeof req.query?.userId === "string" ? req.query.userId : null;

    if (!authToken || !userId) {
      return res.status(400).json({
        error:
          "authorization Bearer token and userId query parameter are required",
      });
    }

    const result = await assistantChatUseCases.listChats({ authToken, userId });
    return res.json({ chats: result.chats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI error";
    return res.status(500).json({ error: message });
  }
});

app.put("/api/ai/chats/:conversationId", async (req, res) => {
  try {
    const authToken =
      extractBearerToken(req) ||
      (typeof req.body?.authToken === "string" ? req.body.authToken : null);
    const userId =
      typeof req.body?.userId === "string" ? req.body.userId : null;
    const conversationId =
      typeof req.params?.conversationId === "string"
        ? req.params.conversationId
        : null;

    if (!authToken || !userId || !conversationId) {
      return res.status(400).json({
        error:
          "authorization Bearer token, userId, and conversationId are required",
      });
    }

    await assistantChatUseCases.upsertChat({
      authToken,
      userId,
      conversationId,
      title: typeof req.body?.title === "string" ? req.body.title : undefined,
      pinned: Boolean(req.body?.pinned),
      updatedAt:
        typeof req.body?.updatedAt === "string"
          ? req.body.updatedAt
          : undefined,
      provider:
        typeof req.body?.provider === "string" ? req.body.provider : undefined,
      model: typeof req.body?.model === "string" ? req.body.model : undefined,
      systemPrompt:
        typeof req.body?.systemPrompt === "string"
          ? req.body.systemPrompt
          : undefined,
      transcript: Array.isArray(req.body?.transcript)
        ? req.body.transcript
        : [],
    });

    return res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI error";
    return res.status(500).json({ error: message });
  }
});

app.delete("/api/ai/chats/:conversationId", async (req, res) => {
  try {
    const authToken =
      extractBearerToken(req) ||
      (typeof req.query?.authToken === "string" ? req.query.authToken : null);
    const userId =
      typeof req.query?.userId === "string" ? req.query.userId : null;
    const conversationId =
      typeof req.params?.conversationId === "string"
        ? req.params.conversationId
        : null;

    if (!authToken || !userId || !conversationId) {
      return res.status(400).json({
        error:
          "authorization Bearer token, userId query parameter, and conversationId are required",
      });
    }

    await assistantChatUseCases.deleteChat({
      authToken,
      userId,
      conversationId,
    });

    return res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI error";
    return res.status(500).json({ error: message });
  }
});

app.post("/api/ai/chat", async (req, res) => {
  try {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];

    if (messages.length === 0) {
      return res.status(400).json({ error: "messages is required" });
    }

    const chatRequest = buildChatRequest(req.body);
    const result = await assistantChatUseCases.reply({
      ...chatRequest,
      messages,
    });

    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI error";
    return res.status(500).json({ error: message });
  }
});

app.post("/api/ai/chat/stream", async (req, res) => {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];

  if (messages.length === 0) {
    return res.status(400).json({ error: "messages is required" });
  }

  const chatRequest = buildChatRequest(req.body);

  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  try {
    for await (const chunk of assistantChatUseCases.streamReply({
      ...chatRequest,
      messages,
    })) {
      res.write(`${JSON.stringify(chunk)}\n`);
    }

    if (!res.writableEnded) {
      res.end();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI error";
    if (!res.writableEnded) {
      res.write(`${JSON.stringify({ error: message, done: true })}\n`);
      res.end();
    }
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
