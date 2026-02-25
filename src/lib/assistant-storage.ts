import { firebaseAuth } from "@/lib/firebase";

export type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type AssistantConversation = {
  id: string;
  title: string;
  pinned: boolean;
  updatedAt: string;
  messages: UiMessage[];
};

export type AssistantProvider = "ollama" | "vertex";

export type StoredAssistantState = {
  activeConversationId: string | null;
  conversations: AssistantConversation[];
  systemPrompt: string;
  provider: AssistantProvider;
  model: string;
};

export const DEFAULT_SYSTEM_PROMPT =
  "You are an assistant for a personal knowledge management app. Keep responses concise and practical.";
export const DEFAULT_MODEL = "qwen3:8b";
export const DEFAULT_CONVERSATION_TITLE = "New chat";
export const ASSISTANT_STORAGE_EVENT = "pkm:assistant:storage-changed";

export function getAssistantStorageKey(uid?: string | null): string {
  const resolvedUid = uid ?? firebaseAuth.currentUser?.uid ?? "guest";
  return `pkm:assistant:v1:${resolvedUid}`;
}

export function deriveConversationTitle(input: string): string {
  const candidate = input.replace(/\s+/g, " ").trim();
  if (!candidate) {
    return DEFAULT_CONVERSATION_TITLE;
  }

  return candidate.slice(0, 60);
}

export function createEmptyConversation(): AssistantConversation {
  return {
    id: crypto.randomUUID(),
    title: DEFAULT_CONVERSATION_TITLE,
    pinned: false,
    updatedAt: new Date().toISOString(),
    messages: [],
  };
}

function asConversations(value: unknown): AssistantConversation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Partial<AssistantConversation> => {
      return typeof item === "object" && item !== null;
    })
    .map((item) => ({
      id:
        typeof item.id === "string" && item.id.length > 0
          ? item.id
          : crypto.randomUUID(),
      title:
        typeof item.title === "string" && item.title.trim().length > 0
          ? item.title
          : DEFAULT_CONVERSATION_TITLE,
      pinned: Boolean(item.pinned),
      updatedAt:
        typeof item.updatedAt === "string"
          ? item.updatedAt
          : new Date().toISOString(),
      messages: Array.isArray(item.messages)
        ? (item.messages as unknown[])
            .filter(
              (message): message is Record<string, unknown> =>
                typeof message === "object" && message !== null,
            )
            .map((message) => ({
              id:
                typeof message.id === "string" && message.id.length > 0
                  ? message.id
                  : crypto.randomUUID(),
              role: message.role === "assistant" ? "assistant" : "user",
              content:
                typeof message.content === "string" ? message.content : "",
            }))
        : [],
    }));
}

export function loadAssistantState(uid?: string | null): StoredAssistantState {
  const storageKey = getAssistantStorageKey(uid);

  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw
      ? (JSON.parse(raw) as Partial<StoredAssistantState>)
      : null;

    const loadedConversations = asConversations(parsed?.conversations);
    const conversations =
      loadedConversations.length > 0
        ? loadedConversations
        : [createEmptyConversation()];

    const candidateActiveId =
      typeof parsed?.activeConversationId === "string"
        ? parsed.activeConversationId
        : null;

    const activeConversationId = conversations.some(
      (conversation) => conversation.id === candidateActiveId,
    )
      ? candidateActiveId
      : (conversations[0]?.id ?? null);

    return {
      activeConversationId,
      conversations,
      systemPrompt:
        typeof parsed?.systemPrompt === "string" &&
        parsed.systemPrompt.trim().length > 0
          ? parsed.systemPrompt
          : DEFAULT_SYSTEM_PROMPT,
      provider: parsed?.provider === "vertex" ? "vertex" : "ollama",
      model:
        typeof parsed?.model === "string" && parsed.model.trim().length > 0
          ? parsed.model
          : DEFAULT_MODEL,
    };
  } catch {
    const fallback = createEmptyConversation();
    return {
      activeConversationId: fallback.id,
      conversations: [fallback],
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      provider: "ollama",
      model: DEFAULT_MODEL,
    };
  }
}

export function sortAssistantConversations(
  conversations: AssistantConversation[],
): AssistantConversation[] {
  return [...conversations].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }

    return (
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
  });
}

export function saveAssistantState(
  state: StoredAssistantState,
  uid?: string | null,
  source = "assistant",
): void {
  const storageKey = getAssistantStorageKey(uid);
  window.localStorage.setItem(storageKey, JSON.stringify(state));
  window.dispatchEvent(
    new CustomEvent(ASSISTANT_STORAGE_EVENT, {
      detail: {
        key: storageKey,
        source,
      },
    }),
  );
}
