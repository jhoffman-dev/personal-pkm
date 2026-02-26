import type { ChatStreamChunk } from "@/lib/ai-client";
import type { RagDocument } from "@/lib/rag-context";
import { streamAssistantReply } from "@/features/assistant/application/stream-assistant-reply";
import { describe, expect, it, vi } from "vitest";

const ragDocuments: RagDocument[] = [
  {
    id: "note:n1",
    sourceType: "Note",
    title: "Launch prep",
    updatedAt: "2026-02-20T00:00:00.000Z",
    content: "Finalize launch checklist and owner assignments.",
  },
];

describe("streamAssistantReply", () => {
  it("streams response and emits thinking/reply deltas", async () => {
    const onThinking = vi.fn();
    const onReplyDelta = vi.fn();
    const onRelevantDocuments = vi.fn();

    const sendStream = vi.fn(
      async (_request: unknown, onChunk: (chunk: ChatStreamChunk) => void) => {
        onChunk({ delta: "<think>Plan</think>" });
        onChunk({ delta: "Here is the answer." });
        onChunk({ done: true });
      },
    );

    const result = await streamAssistantReply({
      provider: "ollama",
      model: "qwen3:8b",
      systemPrompt: "Be concise",
      conversationId: "c1",
      conversationTitle: "Launch",
      userId: "u1",
      prompt: "What is left for launch checklist owner assignments?",
      chatHistory: [],
      ragDocuments,
      sendStream,
      onThinking,
      onReplyDelta,
      onRelevantDocuments,
    });

    expect(sendStream).toHaveBeenCalledTimes(1);
    expect(onRelevantDocuments).toHaveBeenCalledTimes(1);
    expect(onThinking).toHaveBeenCalled();
    expect(onReplyDelta.mock.lastCall?.[0]).toBe("Here is the answer.");
    expect(result.finalReply).toBe("Here is the answer.");
    expect(result.relevantDocuments.length).toBe(1);
  });

  it("throws when stream produces no chunks and no done signal", async () => {
    const sendStream = vi.fn(async () => {
      return;
    });

    await expect(
      streamAssistantReply({
        provider: "ollama",
        model: "qwen3:8b",
        systemPrompt: "Be concise",
        conversationId: "c1",
        conversationTitle: "Chat",
        userId: "u1",
        prompt: "Hello",
        chatHistory: [],
        ragDocuments: [],
        sendStream,
      }),
    ).rejects.toThrow("No streamed response was received from the AI backend");
  });
});
