import { describe, expect, it, vi } from "vitest";
import { createAssistantChatUseCases } from "../../../../backend/application/assistant-chat-use-cases.cjs";

type ChatMessage = { role: "user" | "assistant"; content: string };

function createDependencies() {
  const aiGateway = {
    generateReply: vi.fn(),
    generateReplyStream: vi.fn(),
  };

  const chatRepository = {
    listChats: vi.fn(),
    upsertChat: vi.fn(),
    deleteChat: vi.fn(),
    persistChatRecord: vi.fn(),
  };

  const logger = {
    warn: vi.fn(),
  };

  return { aiGateway, chatRepository, logger };
}

describe("createAssistantChatUseCases", () => {
  it("delegates list and mutation operations to the repository", async () => {
    const dependencies = createDependencies();
    dependencies.chatRepository.listChats.mockResolvedValue({
      chats: [{ id: "c1" }],
    });
    const useCases = createAssistantChatUseCases(dependencies);

    await expect(
      useCases.listChats({ authToken: "t", userId: "u1" }),
    ).resolves.toEqual({ chats: [{ id: "c1" }] });
    expect(dependencies.chatRepository.listChats).toHaveBeenCalledWith({
      authToken: "t",
      userId: "u1",
    });

    await expect(
      useCases.upsertChat({
        authToken: "t",
        userId: "u1",
        conversationId: "c1",
        title: "Chat",
        pinned: true,
        updatedAt: "2026-03-02T00:00:00.000Z",
        provider: "ollama",
        model: "qwen3:8b",
        systemPrompt: "be concise",
        transcript: [{ role: "user", content: "hello" }],
      }),
    ).resolves.toEqual({ ok: true });

    await expect(
      useCases.deleteChat({
        authToken: "t",
        userId: "u1",
        conversationId: "c1",
      }),
    ).resolves.toEqual({ ok: true });
  });

  it("returns reply result and logs when persistence fails", async () => {
    const dependencies = createDependencies();
    const messages: ChatMessage[] = [{ role: "user", content: "hello" }];

    dependencies.aiGateway.generateReply.mockResolvedValue({
      provider: "ollama",
      model: "qwen3:8b",
      reply: "hi",
    });
    dependencies.chatRepository.persistChatRecord.mockRejectedValue(
      new Error("persist failed"),
    );

    const useCases = createAssistantChatUseCases(dependencies);

    await expect(
      useCases.reply({
        provider: "ollama",
        model: "qwen3:8b",
        googleAiStudioApiKey: undefined,
        systemPrompt: "be concise",
        temperature: 0.2,
        maxTokens: 120,
        messages,
        authToken: "t",
        userId: "u1",
        conversationId: "c1",
        conversationTitle: "Title",
      }),
    ).resolves.toEqual({ provider: "ollama", model: "qwen3:8b", reply: "hi" });

    expect(dependencies.chatRepository.persistChatRecord).toHaveBeenCalledWith({
      authToken: "t",
      userId: "u1",
      conversationId: "c1",
      conversationTitle: "Title",
      provider: "ollama",
      model: "qwen3:8b",
      systemPrompt: "be concise",
      messages,
      reply: "hi",
    });
    expect(dependencies.logger.warn).toHaveBeenCalledWith(
      "[pkm-ai] failed to persist chat: persist failed",
    );
  });

  it("streams chunks, persists aggregated reply, and yields every chunk", async () => {
    const dependencies = createDependencies();
    const chunks = [{ delta: "Hel" }, { delta: "lo" }, { done: true }];

    dependencies.aiGateway.generateReplyStream.mockImplementation(
      async function* () {
        for (const chunk of chunks) {
          yield chunk;
        }
      },
    );

    const useCases = createAssistantChatUseCases(dependencies);
    const output: Array<{ delta?: string; done?: boolean }> = [];

    for await (const chunk of useCases.streamReply({
      provider: "ollama",
      model: "qwen3:8b",
      googleAiStudioApiKey: undefined,
      systemPrompt: "be concise",
      temperature: 0.2,
      maxTokens: 120,
      messages: [{ role: "user", content: "hello" }],
      authToken: "t",
      userId: "u1",
      conversationId: "c1",
      conversationTitle: "Title",
    })) {
      output.push(chunk);
    }

    expect(output).toEqual(chunks);
    expect(dependencies.chatRepository.persistChatRecord).toHaveBeenCalledWith({
      authToken: "t",
      userId: "u1",
      conversationId: "c1",
      conversationTitle: "Title",
      provider: "ollama",
      model: "qwen3:8b",
      systemPrompt: "be concise",
      messages: [{ role: "user", content: "hello" }],
      reply: "Hello",
    });
  });
});
