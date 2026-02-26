import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  Company,
  Meeting,
  Note,
  Person,
  Project,
  Task,
} from "@/data/entities";
import { sendChatStream, type ChatMessage } from "@/lib/ai-client";
import { loadAppSettings } from "@/lib/app-settings";
import { firebaseAuth } from "@/lib/firebase";
import {
  buildRagContextBlock,
  retrieveRelevantDocuments,
  type RagDocument,
} from "@/lib/rag-context";
import {
  ASSISTANT_STORAGE_EVENT,
  type AssistantConversation,
  type AssistantProvider,
  createEmptyConversation,
  DEFAULT_CONVERSATION_TITLE,
  deriveConversationTitle,
  hydrateAssistantStateFromFirestore,
  loadAssistantState,
  saveAssistantState,
  type StoredAssistantState,
  type UiMessage,
} from "@/lib/assistant-storage";
import { dataThunks, useAppDispatch, useAppSelector } from "@/store";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useMemo, useRef, useState } from "react";

const ASSISTANT_PAGE_SOURCE = "assistant-page";

const PROVIDER_DEFAULT_MODELS: Record<AssistantProvider, string> = {
  ollama: "qwen3:8b",
  gemini: "gemini-2.5-flash",
  vertex: "gemini-2.5-flash",
};

const SCROLL_BOTTOM_THRESHOLD_PX = 80;

function toPlainText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value: string, maxLength = 600): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}…`;
}

function personName(person: Person): string {
  return `${person.firstName} ${person.lastName}`.replace(/\s+/g, " ").trim();
}

function conversationExcerpt(conversation: AssistantConversation): string {
  return conversation.messages
    .slice(-8)
    .map((message) => `${message.role}: ${toPlainText(message.content)}`)
    .join("\n")
    .trim();
}

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

function extractCitedSourceIndexes(content: string): number[] {
  const orderedIndexes: number[] = [];
  const seenIndexes = new Set<number>();
  const citationRegex = /\[(\d+)\]/g;

  let match = citationRegex.exec(content);
  while (match) {
    const value = Number(match[1]);
    if (Number.isInteger(value) && value > 0 && !seenIndexes.has(value)) {
      seenIndexes.add(value);
      orderedIndexes.push(value);
    }

    match = citationRegex.exec(content);
  }

  return orderedIndexes;
}

function resolveCitedSources(
  content: string,
  sources: RagDocument[],
): {
  citationIndex: number;
  originalCitationIndex: number;
  source: RagDocument;
}[] {
  const citedIndexes = extractCitedSourceIndexes(content);
  const resolved = citedIndexes
    .map((originalCitationIndex, index) => {
      const source = sources[originalCitationIndex - 1];
      if (!source) {
        return null;
      }

      return {
        citationIndex: index + 1,
        originalCitationIndex,
        source,
      };
    })
    .filter(Boolean) as {
    citationIndex: number;
    originalCitationIndex: number;
    source: RagDocument;
  }[];

  const seenSourceIds = new Set<string>();
  return resolved.filter((entry) => {
    if (seenSourceIds.has(entry.source.id)) {
      return false;
    }

    seenSourceIds.add(entry.source.id);
    return true;
  });
}

function remapCitationIndexes(
  content: string,
  citedSources: { citationIndex: number; originalCitationIndex: number }[],
): string {
  if (citedSources.length === 0) {
    return content;
  }

  const indexMap = new Map<number, number>();
  citedSources.forEach((entry) => {
    indexMap.set(entry.originalCitationIndex, entry.citationIndex);
  });

  return content.replace(/\[(\d+)\]/g, (_value, indexText: string) => {
    const original = Number(indexText);
    const remapped = indexMap.get(original);

    return remapped ? `[${remapped}]` : `[${indexText}]`;
  });
}

export function AssistantPage() {
  const dispatch = useAppDispatch();
  const projectsState = useAppSelector((state) => state.projects);
  const notesState = useAppSelector((state) => state.notes);
  const tasksState = useAppSelector((state) => state.tasks);
  const meetingsState = useAppSelector((state) => state.meetings);
  const companiesState = useAppSelector((state) => state.companies);
  const peopleState = useAppSelector((state) => state.people);
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
  const [ragSourcesByMessageId, setRagSourcesByMessageId] = useState<
    Record<string, RagDocument[]>
  >({});
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const geminiApiKey = loadAppSettings().googleAiStudioApiKey.trim();
  const isGeminiKeyConfigured = geminiApiKey.length > 0;

  const isNearBottom = (container: HTMLDivElement) => {
    return (
      container.scrollHeight - container.scrollTop - container.clientHeight <=
      SCROLL_BOTTOM_THRESHOLD_PX
    );
  };

  const scrollMessagesToBottom = (
    behavior: ScrollBehavior = "auto",
    force = false,
  ) => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    if (!force && !autoScrollEnabled) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  };

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
    if (projectsState.status === "idle") {
      void dispatch(dataThunks.projects.fetchAll());
    }
    if (notesState.status === "idle") {
      void dispatch(dataThunks.notes.fetchAll());
    }
    if (tasksState.status === "idle") {
      void dispatch(dataThunks.tasks.fetchAll());
    }
    if (meetingsState.status === "idle") {
      void dispatch(dataThunks.meetings.fetchAll());
    }
    if (companiesState.status === "idle") {
      void dispatch(dataThunks.companies.fetchAll());
    }
    if (peopleState.status === "idle") {
      void dispatch(dataThunks.people.fetchAll());
    }
  }, [
    companiesState.status,
    dispatch,
    meetingsState.status,
    notesState.status,
    peopleState.status,
    projectsState.status,
    tasksState.status,
  ]);

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

  useEffect(() => {
    setAutoScrollEnabled(true);
    scrollMessagesToBottom("auto", true);
  }, [assistantState.activeConversationId, messages.length]);

  useEffect(() => {
    if (!streamingMessageId) {
      return;
    }

    scrollMessagesToBottom("auto");
  }, [streamingMessageId, streamingThinking]);

  const chatHistory = useMemo<ChatMessage[]>(
    () =>
      messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    [messages],
  );

  const ragDocuments = useMemo(() => {
    const projects: Project[] = projectsState.ids
      .map((id) => projectsState.entities[id])
      .filter(Boolean);
    const notes: Note[] = notesState.ids
      .map((id) => notesState.entities[id])
      .filter(Boolean);
    const tasks: Task[] = tasksState.ids
      .map((id) => tasksState.entities[id])
      .filter(Boolean);
    const meetings: Meeting[] = meetingsState.ids
      .map((id) => meetingsState.entities[id])
      .filter(Boolean);
    const companies: Company[] = companiesState.ids
      .map((id) => companiesState.entities[id])
      .filter(Boolean);
    const people: Person[] = peopleState.ids
      .map((id) => peopleState.entities[id])
      .filter(Boolean);

    const documents = [
      ...projects.map((project) => ({
        id: `project:${project.id}`,
        sourceType: "Project",
        title: project.name || "Untitled project",
        updatedAt: project.updatedAt,
        content: truncate(
          [
            project.description,
            (project.tags ?? []).join(" "),
            project.paraType,
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      })),
      ...notes.map((note) => ({
        id: `note:${note.id}`,
        sourceType: "Note",
        title: note.title || "Untitled note",
        updatedAt: note.updatedAt,
        content: truncate(
          [toPlainText(note.body), (note.tags ?? []).join(" ")]
            .filter(Boolean)
            .join("\n"),
          900,
        ),
      })),
      ...tasks.map((task) => ({
        id: `task:${task.id}`,
        sourceType: "Task",
        title: task.title || "Untitled task",
        updatedAt: task.updatedAt,
        content: truncate(
          [
            task.description,
            task.notes,
            `status:${task.status}`,
            `level:${task.level}`,
            (task.tags ?? []).join(" "),
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      })),
      ...meetings.map((meeting) => ({
        id: `meeting:${meeting.id}`,
        sourceType: "Meeting",
        title: meeting.title || "Untitled meeting",
        updatedAt: meeting.updatedAt,
        content: truncate(
          [
            meeting.location,
            `scheduled:${meeting.scheduledFor}`,
            (meeting.tags ?? []).join(" "),
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      })),
      ...companies.map((company) => ({
        id: `company:${company.id}`,
        sourceType: "Company",
        title: company.name || "Untitled company",
        updatedAt: company.updatedAt,
        content: truncate(
          [
            company.email,
            company.phone,
            company.website,
            company.address,
            (company.tags ?? []).join(" "),
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      })),
      ...people.map((person) => ({
        id: `person:${person.id}`,
        sourceType: "Person",
        title: personName(person) || "Unnamed person",
        updatedAt: person.updatedAt,
        content: truncate(
          [
            person.email,
            person.phone,
            person.address,
            (person.tags ?? []).join(" "),
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      })),
      ...assistantState.conversations
        .filter(
          (conversation) =>
            conversation.id !== assistantState.activeConversationId,
        )
        .map((conversation) => ({
          id: `chat:${conversation.id}`,
          sourceType: "Assistant Chat",
          title: conversation.title || DEFAULT_CONVERSATION_TITLE,
          updatedAt: conversation.updatedAt,
          content: truncate(conversationExcerpt(conversation), 1200),
        })),
    ];

    return documents.filter((document) => {
      const title = document.title.trim();
      const content = document.content.trim();
      return title.length > 0 || content.length > 0;
    });
  }, [
    assistantState.activeConversationId,
    assistantState.conversations,
    companiesState.entities,
    companiesState.ids,
    meetingsState.entities,
    meetingsState.ids,
    notesState.entities,
    notesState.ids,
    peopleState.entities,
    peopleState.ids,
    projectsState.entities,
    projectsState.ids,
    tasksState.entities,
    tasksState.ids,
  ]);

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
    setAutoScrollEnabled(true);
    setStreamingMessageId(assistantMessageId);
    setStreamingThinking("Thinking...");

    try {
      const authToken = await firebaseAuth.currentUser
        ?.getIdToken()
        .catch(() => undefined);

      let rawStreamContent = "";
      let streamReportedDone = false;
      const relevantDocuments = retrieveRelevantDocuments({
        query: value,
        documents: ragDocuments,
      });
      setRagSourcesByMessageId((previous) => ({
        ...previous,
        [assistantMessageId]: relevantDocuments,
      }));
      const ragContextBlock = buildRagContextBlock(relevantDocuments);
      const baseSystemPrompt = assistantState.systemPrompt.trim();
      const resolvedSystemPrompt = ragContextBlock
        ? `${baseSystemPrompt}\n\nUse the following retrieved workspace context as reference. Prioritize it when relevant, and if context is incomplete, state uncertainty briefly. When you use retrieved context, cite sources inline using bracket indices like [1], [2] that map to the list below. Do not invent citations.\n\n${ragContextBlock}`
        : baseSystemPrompt;

      await sendChatStream(
        {
          provider: assistantState.provider,
          model: assistantState.model.trim() || undefined,
          googleAiStudioApiKey:
            assistantState.provider === "gemini"
              ? geminiApiKey || undefined
              : undefined,
          systemPrompt: resolvedSystemPrompt || undefined,
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
      setRagSourcesByMessageId((previous) => {
        const next = { ...previous };
        delete next[assistantMessageId];
        return next;
      });
    } finally {
      setIsSending(false);
      setStreamingMessageId(null);
      setStreamingThinking("");
    }
  };

  const createNewChat = () => {
    if (isSending) {
      return;
    }

    const conversation = createEmptyConversation();
    setError(null);
    setPrompt("");
    setAutoScrollEnabled(true);
    setAssistantState((previous) => ({
      ...previous,
      activeConversationId: conversation.id,
      conversations: [conversation, ...previous.conversations],
    }));
  };

  return (
    <section className="h-[calc(100svh-41px)] p-6">
      <Card className="h-full py-0">
        <CardContent className="flex h-full min-h-0 p-4">
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="mr-2 text-lg font-semibold">Assistant</h2>

              <Button
                variant="outline"
                size="sm"
                onClick={createNewChat}
                disabled={isSending}
              >
                New chat
              </Button>

              <select
                value={assistantState.provider}
                onChange={(event) =>
                  setAssistantState((previous) => ({
                    ...previous,
                    provider: event.target.value as AssistantProvider,
                    model:
                      PROVIDER_DEFAULT_MODELS[
                        event.target.value as AssistantProvider
                      ],
                  }))
                }
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              >
                <option value="ollama">Ollama</option>
                <option value="gemini">Gemini (AI Studio)</option>
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

              {assistantState.provider === "gemini" ? (
                <span
                  className={`rounded-md border px-2 py-1 text-xs ${
                    isGeminiKeyConfigured
                      ? "bg-muted text-foreground"
                      : "text-destructive"
                  }`}
                >
                  Gemini key {isGeminiKeyConfigured ? "configured" : "missing"}
                </span>
              ) : null}
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

            <div
              ref={messagesContainerRef}
              onScroll={(event) => {
                const container = event.currentTarget;
                setAutoScrollEnabled(isNearBottom(container));
              }}
              className="bg-muted/20 flex-1 space-y-2 overflow-y-auto rounded-md border p-3"
            >
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
                    {message.role === "assistant"
                      ? (() => {
                          const candidateSources =
                            ragSourcesByMessageId[message.id] ?? [];
                          const citedSources = resolveCitedSources(
                            message.content,
                            candidateSources,
                          );
                          const remappedContent = remapCitationIndexes(
                            message.content,
                            citedSources,
                          );

                          return (
                            <div className="space-y-2">
                              {streamingMessageId === message.id ? (
                                <div className="bg-muted text-muted-foreground rounded-md border px-2 py-1 text-xs whitespace-pre-wrap">
                                  <p className="font-medium">Thinking</p>
                                  <p>{streamingThinking || "Thinking..."}</p>
                                </div>
                              ) : null}

                              <div className="[&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic [&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_h1]:mt-1 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mt-1 [&_h2]:text-base [&_h2]:font-semibold [&_li]:my-0.5 [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:my-2 [&_pre]:bg-muted [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:p-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:ml-5 [&_ul]:list-disc">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {remappedContent}
                                </ReactMarkdown>
                              </div>

                              {citedSources.length > 0 ? (
                                <div className="mt-2 rounded-md border px-2 py-1 text-xs">
                                  <p className="text-muted-foreground font-medium">
                                    Sources
                                  </p>
                                  <ul className="mt-1 space-y-0.5">
                                    {citedSources.map(
                                      ({ citationIndex, source }) => (
                                        <li key={`${message.id}:${source.id}`}>
                                          [{citationIndex}] {source.sourceType}:{" "}
                                          {source.title}
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                </div>
                              ) : null}
                            </div>
                          );
                        })()
                      : message.content}
                  </div>
                ))
              )}
            </div>

            {!autoScrollEnabled && messages.length > 0 ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAutoScrollEnabled(true);
                    scrollMessagesToBottom("smooth", true);
                  }}
                >
                  Jump to latest
                </Button>
              </div>
            ) : null}

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
