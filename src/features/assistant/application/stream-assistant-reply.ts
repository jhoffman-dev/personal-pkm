import {
  sendChatStream,
  type ChatMessage,
  type ChatStreamChunk,
} from "@/lib/ai-client";
import type { AssistantProvider } from "@/lib/assistant-storage";
import {
  buildRagContextBlock,
  retrieveRelevantDocuments,
  type RagDocument,
} from "@/lib/rag-context";
import { parseThinkingAndReply } from "@/features/assistant/domain/citation-utils";

export type StreamAssistantReplyParams = {
  provider: AssistantProvider;
  model: string;
  systemPrompt: string;
  conversationId: string;
  conversationTitle: string;
  userId: string;
  prompt: string;
  chatHistory: ChatMessage[];
  ragDocuments: RagDocument[];
  authToken?: string;
  geminiApiKey?: string;
  onRelevantDocuments?: (documents: RagDocument[]) => void;
  onThinking?: (thinking: string) => void;
  onReplyDelta?: (reply: string) => void;
  sendStream?: (
    request: Parameters<typeof sendChatStream>[0],
    onChunk: (chunk: ChatStreamChunk) => void,
  ) => Promise<void>;
};

export type StreamAssistantReplyResult = {
  finalReply: string;
  rawStreamContent: string;
  relevantDocuments: RagDocument[];
};

const RAG_SYSTEM_PROMPT_APPENDIX =
  "Use the following retrieved workspace context as reference. Prioritize it when relevant, and if context is incomplete, state uncertainty briefly. When you use retrieved context, cite sources inline using bracket indices like [1], [2] that map to the list below. Do not invent citations.";

export async function streamAssistantReply(
  params: StreamAssistantReplyParams,
): Promise<StreamAssistantReplyResult> {
  const sendStream = params.sendStream ?? sendChatStream;

  const relevantDocuments = retrieveRelevantDocuments({
    query: params.prompt,
    documents: params.ragDocuments,
  });
  params.onRelevantDocuments?.(relevantDocuments);

  const ragContextBlock = buildRagContextBlock(relevantDocuments);
  const baseSystemPrompt = params.systemPrompt.trim();
  const resolvedSystemPrompt = ragContextBlock
    ? `${baseSystemPrompt}\n\n${RAG_SYSTEM_PROMPT_APPENDIX}\n\n${ragContextBlock}`
    : baseSystemPrompt;

  let rawStreamContent = "";
  let streamReportedDone = false;

  await sendStream(
    {
      provider: params.provider,
      model: params.model.trim() || undefined,
      googleAiStudioApiKey:
        params.provider === "gemini"
          ? params.geminiApiKey || undefined
          : undefined,
      systemPrompt: resolvedSystemPrompt || undefined,
      authToken: params.authToken,
      userId: params.userId,
      conversationId: params.conversationId,
      conversationTitle: params.conversationTitle,
      messages: [
        ...params.chatHistory,
        { role: "user", content: params.prompt },
      ],
    },
    (chunk) => {
      if (chunk.error) {
        throw new Error(chunk.error);
      }

      if (typeof chunk.delta === "string" && chunk.delta.length > 0) {
        rawStreamContent += chunk.delta;
        const parsed = parseThinkingAndReply(rawStreamContent);

        params.onThinking?.(parsed.thinking || "Thinking...");
        params.onReplyDelta?.(parsed.reply);
      }

      if (chunk.done) {
        streamReportedDone = true;
      }
    },
  );

  if (!streamReportedDone && rawStreamContent.length === 0) {
    throw new Error("No streamed response was received from the AI backend");
  }

  const parsed = parseThinkingAndReply(rawStreamContent);
  return {
    finalReply: parsed.reply || rawStreamContent,
    rawStreamContent,
    relevantDocuments,
  };
}
