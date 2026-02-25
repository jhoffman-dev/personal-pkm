export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatRequest = {
  provider?: "ollama" | "gemini" | "vertex";
  model?: string;
  googleAiStudioApiKey?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  authToken?: string;
  userId?: string;
  conversationId?: string;
  conversationTitle?: string;
  messages: ChatMessage[];
};

export type ChatResponse = {
  provider: string;
  model: string | null;
  reply: string;
};

export type ChatStreamChunk = {
  provider?: string;
  model?: string | null;
  delta?: string;
  done?: boolean;
  reply?: string;
  error?: string;
};

export type AssistantChatRecord = {
  id: string;
  title?: string;
  pinned?: boolean;
  updatedAt?: string;
  provider?: string;
  model?: string | null;
  systemPrompt?: string;
  transcript?: ChatMessage[];
};

function getAiBaseUrl(): string {
  const electronUrl = window.pkmDesktop?.aiBaseUrl;
  if (electronUrl) {
    return electronUrl;
  }

  const envUrl = import.meta.env.VITE_AI_BASE_URL as string | undefined;
  if (envUrl) {
    return envUrl;
  }

  return "http://127.0.0.1:11435";
}

export async function sendChat(request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch(`${getAiBaseUrl()}/api/ai/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "AI request failed");
  }

  return response.json() as Promise<ChatResponse>;
}

export async function sendChatStream(
  request: ChatRequest,
  onChunk: (chunk: ChatStreamChunk) => void,
): Promise<void> {
  const response = await fetch(`${getAiBaseUrl()}/api/ai/chat/stream`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    if (response.status === 404 || response.status === 405) {
      const fallback = await sendChat(request);
      onChunk({
        provider: fallback.provider,
        model: fallback.model,
        delta: fallback.reply,
        done: true,
        reply: fallback.reply,
      });
      return;
    }

    const errorText = await response.text();
    throw new Error(errorText || "AI streaming request failed");
  }

  if (!response.body) {
    throw new Error("Streaming response body is unavailable");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return;
      }

      try {
        const chunk = JSON.parse(trimmed) as ChatStreamChunk;
        onChunk(chunk);
      } catch {
        // Ignore malformed chunk lines.
      }
    });
  }

  const finalChunk = buffer.trim();
  if (finalChunk) {
    try {
      const chunk = JSON.parse(finalChunk) as ChatStreamChunk;
      onChunk(chunk);
    } catch {
      // Ignore malformed trailing chunk.
    }
  }
}

export async function listAssistantChats(params: {
  authToken: string;
  userId: string;
}): Promise<{ chats: AssistantChatRecord[] }> {
  const { authToken, userId } = params;

  const response = await fetch(
    `${getAiBaseUrl()}/api/ai/chats?userId=${encodeURIComponent(userId)}`,
    {
      method: "GET",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to list assistant chats");
  }

  return response.json() as Promise<{ chats: AssistantChatRecord[] }>;
}

export async function upsertAssistantChat(params: {
  authToken: string;
  userId: string;
  conversationId: string;
  title: string;
  pinned: boolean;
  updatedAt: string;
  provider?: string;
  model?: string;
  systemPrompt?: string;
  transcript: ChatMessage[];
}): Promise<void> {
  const { authToken, conversationId, ...payload } = params;

  const response = await fetch(
    `${getAiBaseUrl()}/api/ai/chats/${encodeURIComponent(conversationId)}`,
    {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to upsert assistant chat");
  }
}

export async function deleteAssistantChat(params: {
  authToken: string;
  userId: string;
  conversationId: string;
}): Promise<void> {
  const { authToken, userId, conversationId } = params;

  const response = await fetch(
    `${getAiBaseUrl()}/api/ai/chats/${encodeURIComponent(
      conversationId,
    )}?userId=${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to delete assistant chat");
  }
}
