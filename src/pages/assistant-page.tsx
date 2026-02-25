import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { sendChatStream, type ChatMessage } from "@/lib/ai-client";
import { firebaseAuth } from "@/lib/firebase";
import {
  ASSISTANT_STORAGE_EVENT,
  DEFAULT_CONVERSATION_TITLE,
  deriveConversationTitle,
  hydrateAssistantStateFromFirestore,
  loadAssistantState,
  saveAssistantState,
  type StoredAssistantState,
  type UiMessage,
} from "@/lib/assistant-storage";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useMemo, useState } from "react";

const ASSISTANT_PAGE_SOURCE = "assistant-page";

function parseThinkingAndReply(content: string): {
  thinking: string;
  reply: string;
} {
  const openTag = "<think>";
  const closeTag = "</think>";
  const openIndex = content.indexOf(openTag);

  if (openIndex === -1) {
    return {
      thinking: "",
      reply: content,
    };
  }

  const thinkingStart = openIndex + openTag.length;
  const closeIndex = content.indexOf(closeTag, thinkingStart);

  if (closeIndex === -1) {
    return {
      thinking: content.slice(thinkingStart).trim(),
      reply: "",
    };
  }

  return {
    thinking: content.slice(thinkingStart, closeIndex).trim(),
    reply: content.slice(closeIndex + closeTag.length).trimStart(),
  };
}

export function AssistantPage() {
  const userId = firebaseAuth.currentUser?.uid ?? "guest";
  const [assistantState, setAssistantState] = useState<StoredAssistantState>(
    () => loadAssistantState(userId),
  );
  const [prompt, setPrompt] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null,
  );
  const [streamingThinking, setStreamingThinking] = useState("");

  useEffect(() => {
    setAssistantState(loadAssistantState(userId));
    setIsHydrated(true);

    void hydrateAssistantStateFromFirestore(userId)
      .then((nextState) => {
        setAssistantState(nextState);
      })
      .catch(() => {
        // Keep in-memory state if backend hydration fails.
      });
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

      setAssistantState(loadAssistantState(userId));
    };

    window.addEventListener(ASSISTANT_STORAGE_EVENT, onAssistantStorageChanged);

    return () => {
      window.removeEventListener(
        ASSISTANT_STORAGE_EVENT,
        onAssistantStorageChanged,
      );
    };
  }, [userId]);

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
    const assistantMessageId = crypto.randomUUID();
    const assistantPlaceholder: UiMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
    };

    const nextMessages = [...messages, userMessage, assistantPlaceholder];
    const now = new Date().toISOString();
    const conversationTitle =
      activeConversation?.title === DEFAULT_CONVERSATION_TITLE
        ? deriveConversationTitle(value)
        : (activeConversation?.title ?? DEFAULT_CONVERSATION_TITLE);

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
    setStreamingMessageId(assistantMessageId);
    setStreamingThinking("Thinking...");

    try {
      const authToken = await firebaseAuth.currentUser
        ?.getIdToken()
        .catch(() => undefined);

      let rawStreamContent = "";
      let streamReportedDone = false;

      await sendChatStream(
        {
          provider: assistantState.provider,
          model: assistantState.model.trim() || undefined,
          systemPrompt: assistantState.systemPrompt.trim() || undefined,
          authToken,
          userId,
          conversationId,
          conversationTitle,
          messages: [...chatHistory, { role: "user", content: value }],
        },
        (chunk) => {
          if (chunk.error) {
            throw new Error(chunk.error);
          }

          if (typeof chunk.delta === "string" && chunk.delta.length > 0) {
            rawStreamContent += chunk.delta;
            const parsed = parseThinkingAndReply(rawStreamContent);
            setStreamingThinking(parsed.thinking || "Thinking...");

            setAssistantState((previous) => ({
              ...previous,
              conversations: previous.conversations.map((conversation) =>
                conversation.id === conversationId
                  ? {
                      ...conversation,
                      updatedAt: new Date().toISOString(),
                      messages: conversation.messages.map((message) =>
                        message.id === assistantMessageId
                          ? {
                              ...message,
                              content: parsed.reply,
                            }
                          : message,
                      ),
                    }
                  : conversation,
              ),
            }));
          }

          if (chunk.done) {
            streamReportedDone = true;
          }
        },
      );

      if (!streamReportedDone && rawStreamContent.length === 0) {
        throw new Error(
          "No streamed response was received from the AI backend",
        );
      }

      const parsed = parseThinkingAndReply(rawStreamContent);
      const finalReply = parsed.reply || rawStreamContent;

      setAssistantState((previous) => ({
        ...previous,
        conversations: previous.conversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                updatedAt: new Date().toISOString(),
                messages: conversation.messages.map((message) =>
                  message.id === assistantMessageId
                    ? {
                        ...message,
                        content: finalReply,
                      }
                    : message,
                ),
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

      setAssistantState((previous) => ({
        ...previous,
        conversations: previous.conversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: conversation.messages.filter(
                  (message) => message.id !== assistantMessageId,
                ),
              }
            : conversation,
        ),
      }));
    } finally {
      setIsSending(false);
      setStreamingMessageId(null);
      setStreamingThinking("");
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
                      <div className="space-y-2">
                        {streamingMessageId === message.id ? (
                          <div className="bg-muted text-muted-foreground rounded-md border px-2 py-1 text-xs whitespace-pre-wrap">
                            <p className="font-medium">Thinking</p>
                            <p>{streamingThinking || "Thinking..."}</p>
                          </div>
                        ) : null}

                        <div className="[&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic [&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_h1]:mt-1 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mt-1 [&_h2]:text-base [&_h2]:font-semibold [&_li]:my-0.5 [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:my-2 [&_pre]:bg-muted [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:p-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:ml-5 [&_ul]:list-disc">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
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
