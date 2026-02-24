export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatRequest = {
  provider?: "ollama" | "vertex";
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  messages: ChatMessage[];
};

export type ChatResponse = {
  provider: string;
  model: string | null;
  reply: string;
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
