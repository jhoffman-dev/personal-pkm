import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { sendChat, type ChatMessage } from "@/lib/ai-client";
import { firebaseAuth } from "@/lib/firebase";
import {
  ASSISTANT_STORAGE_EVENT,
  DEFAULT_CONVERSATION_TITLE,
  deriveConversationTitle,
  getAssistantStorageKey,
  loadAssistantState,
  saveAssistantState,
  type StoredAssistantState,
  type UiMessage,
} from "@/lib/assistant-storage";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useMemo, useState } from "react";

const ASSISTANT_PAGE_SOURCE = "assistant-page";

export function AssistantPage() {
  const userId = firebaseAuth.currentUser?.uid ?? "guest";
  const storageKey = getAssistantStorageKey(userId);
  const [assistantState, setAssistantState] = useState<StoredAssistantState>(
    () => loadAssistantState(userId),
  );
  const [prompt, setPrompt] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setAssistantState(loadAssistantState(userId));
    setIsHydrated(true);
  }, [userId]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveAssistantState(assistantState, userId, ASSISTANT_PAGE_SOURCE);
  }, [assistantState, isHydrated, userId]);

  useEffect(() => {
    const onAssistantStorageChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{
        key?: string;
        source?: string;
      }>;
      if (customEvent.detail?.source === ASSISTANT_PAGE_SOURCE) {
        return;
      }

      if (customEvent.detail?.key && customEvent.detail.key !== storageKey) {
        return;
      }

      setAssistantState(loadAssistantState(userId));
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) {
        return;
      }

      setAssistantState(loadAssistantState(userId));
    };

    window.addEventListener(ASSISTANT_STORAGE_EVENT, onAssistantStorageChanged);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(
        ASSISTANT_STORAGE_EVENT,
        onAssistantStorageChanged,
      );
      window.removeEventListener("storage", onStorage);
    };
  }, [storageKey, userId]);

  const activeConversation = useMemo(
    () =>
      assistantState.conversations.find(
        (conversation) =>
          conversation.id === assistantState.activeConversationId,
      ) ?? null,
    [assistantState.activeConversationId, assistantState.conversations],
  );

  const messages = activeConversation?.messages ?? [];

  const chatHistory = useMemo<ChatMessage[]>(
    () =>
      messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    [messages],
  );

  const send = async () => {
    const value = prompt.trim();
    const conversationId = activeConversation?.id;

    if (!value || isSending || !conversationId) {
      return;
    }

    const userMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: value,
    };

    const nextMessages = [...messages, userMessage];
    const now = new Date().toISOString();

    setAssistantState((previous) => ({
      ...previous,
      conversations: previous.conversations.map((conversation) => {
        if (conversation.id !== conversationId) {
          return conversation;
        }

        const nextTitle =
          conversation.title === DEFAULT_CONVERSATION_TITLE
            ? deriveConversationTitle(value)
            : conversation.title;

        return {
          ...conversation,
          title: nextTitle,
          updatedAt: now,
          messages: nextMessages,
        };
      }),
    }));

    setPrompt("");
    setError(null);
    setIsSending(true);

    try {
      const result = await sendChat({
        provider: assistantState.provider,
        model: assistantState.model.trim() || undefined,
        systemPrompt: assistantState.systemPrompt.trim() || undefined,
        messages: [...chatHistory, { role: "user", content: value }],
      });

      const assistantMessage: UiMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.reply,
      };

      setAssistantState((previous) => ({
        ...previous,
        conversations: previous.conversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                updatedAt: new Date().toISOString(),
                messages: [...conversation.messages, assistantMessage],
              }
            : conversation,
        ),
      }));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to call AI backend",
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="h-[calc(100svh-41px)] p-6">
      <Card className="h-full py-0">
        <CardContent className="flex h-full min-h-0 p-4">
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="mr-2 text-lg font-semibold">Assistant</h2>

              <select
                value={assistantState.provider}
                onChange={(event) =>
                  setAssistantState((previous) => ({
                    ...previous,
                    provider: event.target.value as "ollama" | "vertex",
                  }))
                }
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              >
                <option value="ollama">Ollama</option>
                <option value="vertex">Vertex (future)</option>
              </select>

              <Input
                value={assistantState.model}
                onChange={(event) =>
                  setAssistantState((previous) => ({
                    ...previous,
                    model: event.target.value,
                  }))
                }
                placeholder="Model (e.g. qwen3:8b)"
                className="max-w-52"
              />
            </div>

            <textarea
              value={assistantState.systemPrompt}
              onChange={(event) =>
                setAssistantState((previous) => ({
                  ...previous,
                  systemPrompt: event.target.value,
                }))
              }
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-16 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              placeholder="System prompt"
            />

            <div className="bg-muted/20 flex-1 space-y-2 overflow-y-auto rounded-md border p-3">
              {messages.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Start chatting. Later this interface will also support RAG and
                  action tools (create/edit tasks, notes, people, companies).
                </p>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground ml-auto"
                        : "bg-background border"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="[&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic [&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_h1]:mt-1 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mt-1 [&_h2]:text-base [&_h2]:font-semibold [&_li]:my-0.5 [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:my-2 [&_pre]:bg-muted [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:p-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:ml-5 [&_ul]:list-disc">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                ))
              )}
            </div>

            {error ? <p className="text-destructive text-xs">{error}</p> : null}

            <div className="flex items-center gap-2">
              <Input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void send();
                  }
                }}
                placeholder="Ask something..."
                disabled={isSending}
              />
              <Button
                onClick={() => void send()}
                disabled={isSending || prompt.trim().length === 0}
              >
                {isSending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
