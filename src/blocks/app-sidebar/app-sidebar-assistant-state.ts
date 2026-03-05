import {
  deleteAssistantChat,
  type ChatMessage,
  upsertAssistantChat,
} from "@/lib/ai-client";
import {
  PROVIDER_DEFAULT_MODELS,
  streamAssistantReply,
} from "@/features/assistant";
import {
  ASSISTANT_STORAGE_EVENT,
  type AssistantConversation,
  type AssistantProvider,
  DEFAULT_CONVERSATION_TITLE,
  createEmptyConversation,
  deriveConversationTitle,
  hydrateAssistantStateFromFirestore,
  loadAssistantState,
  saveAssistantState,
  sortAssistantConversations,
  type UiMessage,
  type StoredAssistantState,
} from "@/lib/assistant-storage";
import { firebaseAuth } from "@/lib/firebase";
import type { RagDocument } from "@/lib/rag-context";
import { onAuthStateChanged } from "firebase/auth";
import * as React from "react";

export function useAppSidebarAssistantState(params: {
  isAssistantRoute: boolean;
}) {
  const { isAssistantRoute } = params;
  const [assistantUserId, setAssistantUserId] = React.useState<string>(
    () => firebaseAuth.currentUser?.uid ?? "guest",
  );
  const assistantSourceId = React.useMemo(() => crypto.randomUUID(), []);
  const [assistantState, setAssistantState] =
    React.useState<StoredAssistantState>(() =>
      loadAssistantState(assistantUserId),
    );
  const [renamingConversationId, setRenamingConversationId] = React.useState<
    string | null
  >(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [isSendingMessage, setIsSendingMessage] = React.useState(false);
  const [assistantError, setAssistantError] = React.useState<string | null>(
    null,
  );
  const [streamingThinking, setStreamingThinking] = React.useState("");

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
      setAssistantUserId(nextUser?.uid ?? "guest");
    });

    return () => {
      unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    if (!isAssistantRoute) {
      return;
    }

    setAssistantState(loadAssistantState(assistantUserId));

    void hydrateAssistantStateFromFirestore(assistantUserId)
      .then((nextState) => {
        setAssistantState(nextState);
      })
      .catch(() => {
        // Keep in-memory state if backend hydration fails.
      });
  }, [assistantUserId, isAssistantRoute]);

  React.useEffect(() => {
    const onAssistantStorageChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{
        key?: string;
        source?: string;
      }>;

      if (customEvent.detail?.source === assistantSourceId) {
        return;
      }

      setAssistantState(loadAssistantState(assistantUserId));
    };

    window.addEventListener(ASSISTANT_STORAGE_EVENT, onAssistantStorageChanged);

    return () => {
      window.removeEventListener(
        ASSISTANT_STORAGE_EVENT,
        onAssistantStorageChanged,
      );
    };
  }, [assistantSourceId, assistantUserId]);

  const updateAssistantState = React.useCallback(
    (updater: (previous: StoredAssistantState) => StoredAssistantState) => {
      setAssistantState((previous) => {
        const next = updater(previous);
        saveAssistantState(next, assistantUserId, assistantSourceId);
        return next;
      });
    },
    [assistantSourceId, assistantUserId],
  );

  const sortedAssistantConversations = React.useMemo(
    () => sortAssistantConversations(assistantState.conversations),
    [assistantState.conversations],
  );

  const activeConversation = React.useMemo(
    () =>
      assistantState.conversations.find(
        (conversation) =>
          conversation.id === assistantState.activeConversationId,
      ) ?? null,
    [assistantState.activeConversationId, assistantState.conversations],
  );

  const getCurrentAuthToken = React.useCallback(async () => {
    if (!firebaseAuth.currentUser) {
      return null;
    }

    return firebaseAuth.currentUser.getIdToken().catch(() => null);
  }, []);

  const persistAssistantConversation = React.useCallback(
    async (conversation: AssistantConversation) => {
      const authToken = await getCurrentAuthToken();

      if (!authToken) {
        return;
      }

      await upsertAssistantChat({
        authToken,
        userId: assistantUserId,
        conversationId: conversation.id,
        title: conversation.title,
        pinned: conversation.pinned,
        updatedAt: conversation.updatedAt,
        provider: assistantState.provider,
        model: assistantState.model,
        systemPrompt: assistantState.systemPrompt,
        transcript: conversation.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      });
    },
    [
      assistantState.model,
      assistantState.provider,
      assistantState.systemPrompt,
      assistantUserId,
      getCurrentAuthToken,
    ],
  );

  const removeAssistantConversationFromFirestore = React.useCallback(
    async (conversationId: string) => {
      const authToken = await getCurrentAuthToken();

      if (!authToken) {
        return;
      }

      await deleteAssistantChat({
        authToken,
        userId: assistantUserId,
        conversationId,
      });
    },
    [assistantUserId, getCurrentAuthToken],
  );

  const persistConversationBestEffort = React.useCallback(
    (conversation: AssistantConversation) => {
      void persistAssistantConversation(conversation).catch(() => {
        // Keep local in-memory state if persistence fails.
      });
    },
    [persistAssistantConversation],
  );

  const removeConversationBestEffort = React.useCallback(
    (conversationId: string) => {
      void removeAssistantConversationFromFirestore(conversationId).catch(
        () => {
          // Keep local in-memory state if persistence fails.
        },
      );
    },
    [removeAssistantConversationFromFirestore],
  );

  const sendPrompt = React.useCallback(
    async (params: {
      prompt: string;
      ragDocuments?: RagDocument[];
      geminiApiKey?: string;
    }) => {
      const value = params.prompt.trim();
      if (!value || isSendingMessage || !activeConversation) {
        return false;
      }

      const conversationId = activeConversation.id;
      const existingMessages = activeConversation.messages;
      const chatHistory: ChatMessage[] = existingMessages.map((message) => ({
        role: message.role,
        content: message.content,
      }));
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
      const nextMessages = [
        ...existingMessages,
        userMessage,
        assistantPlaceholder,
      ];
      const now = new Date().toISOString();
      const conversationTitle =
        activeConversation.title === DEFAULT_CONVERSATION_TITLE
          ? deriveConversationTitle(value)
          : activeConversation.title;

      updateAssistantState((previous) => ({
        ...previous,
        conversations: previous.conversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                title:
                  conversation.title === DEFAULT_CONVERSATION_TITLE
                    ? deriveConversationTitle(value)
                    : conversation.title,
                updatedAt: now,
                messages: nextMessages,
              }
            : conversation,
        ),
      }));

      setAssistantError(null);
      setIsSendingMessage(true);
      setStreamingThinking("Thinking...");

      try {
        const authToken = (await getCurrentAuthToken()) ?? undefined;

        const { finalReply } = await streamAssistantReply({
          provider: assistantState.provider,
          model: assistantState.model,
          systemPrompt: assistantState.systemPrompt,
          conversationId,
          conversationTitle,
          userId: assistantUserId,
          prompt: value,
          chatHistory,
          ragDocuments: params.ragDocuments ?? [],
          authToken,
          geminiApiKey: params.geminiApiKey,
          onThinking: (thinking) => {
            setStreamingThinking(thinking || "Thinking...");
          },
          onReplyDelta: (reply) => {
            updateAssistantState((previous) => ({
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
                              content: reply,
                            }
                          : message,
                      ),
                    }
                  : conversation,
              ),
            }));
          },
        });

        let persistedConversation: AssistantConversation | null = null;
        updateAssistantState((previous) => ({
          ...previous,
          conversations: previous.conversations.map((conversation) => {
            if (conversation.id !== conversationId) {
              return conversation;
            }

            const updatedConversation: AssistantConversation = {
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
            };

            persistedConversation = updatedConversation;
            return updatedConversation;
          }),
        }));

        if (persistedConversation) {
          persistConversationBestEffort(persistedConversation);
        }

        return true;
      } catch (requestError) {
        setAssistantError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to call AI backend",
        );

        let persistedConversation: AssistantConversation | null = null;
        updateAssistantState((previous) => ({
          ...previous,
          conversations: previous.conversations.map((conversation) => {
            if (conversation.id !== conversationId) {
              return conversation;
            }

            const updatedConversation: AssistantConversation = {
              ...conversation,
              updatedAt: new Date().toISOString(),
              messages: conversation.messages.filter(
                (message) => message.id !== assistantMessageId,
              ),
            };

            persistedConversation = updatedConversation;
            return updatedConversation;
          }),
        }));

        if (persistedConversation) {
          persistConversationBestEffort(persistedConversation);
        }

        return false;
      } finally {
        setIsSendingMessage(false);
        setStreamingThinking("");
      }
    },
    [
      activeConversation,
      assistantState.model,
      assistantState.provider,
      assistantState.systemPrompt,
      assistantUserId,
      getCurrentAuthToken,
      isSendingMessage,
      persistConversationBestEffort,
      updateAssistantState,
    ],
  );

  const setProvider = React.useCallback(
    (provider: AssistantProvider) => {
      setAssistantError(null);
      updateAssistantState((previous) => ({
        ...previous,
        provider,
        model: PROVIDER_DEFAULT_MODELS[provider],
      }));
    },
    [updateAssistantState],
  );

  const setModel = React.useCallback(
    (model: string) => {
      updateAssistantState((previous) => ({
        ...previous,
        model,
      }));
    },
    [updateAssistantState],
  );

  const createConversation = () => {
    const conversation = createEmptyConversation();
    setAssistantError(null);
    updateAssistantState((previous) => ({
      ...previous,
      activeConversationId: conversation.id,
      conversations: [conversation, ...previous.conversations],
    }));

    persistConversationBestEffort(conversation);
  };

  const toggleConversationPinned = (conversationId: string) => {
    const existingConversation = assistantState.conversations.find(
      (conversation) => conversation.id === conversationId,
    );

    if (!existingConversation) {
      return;
    }

    const updatedConversation: AssistantConversation = {
      ...existingConversation,
      pinned: !existingConversation.pinned,
      updatedAt: new Date().toISOString(),
    };

    updateAssistantState((previous) => ({
      ...previous,
      conversations: previous.conversations.map((conversation) =>
        conversation.id === conversationId ? updatedConversation : conversation,
      ),
    }));

    persistConversationBestEffort(updatedConversation);
  };

  const startConversationRename = (
    conversationId: string,
    currentTitle: string,
  ) => {
    setRenamingConversationId(conversationId);
    setRenameValue(currentTitle);
  };

  const cancelConversationRename = () => {
    setRenamingConversationId(null);
    setRenameValue("");
  };

  const saveConversationRename = (conversationId: string) => {
    const nextTitle = renameValue.trim() || DEFAULT_CONVERSATION_TITLE;
    const existingConversation = assistantState.conversations.find(
      (conversation) => conversation.id === conversationId,
    );

    if (!existingConversation) {
      cancelConversationRename();
      return;
    }

    const updatedConversation: AssistantConversation = {
      ...existingConversation,
      title: nextTitle,
      updatedAt: new Date().toISOString(),
    };

    updateAssistantState((previous) => ({
      ...previous,
      conversations: previous.conversations.map((conversation) =>
        conversation.id === conversationId ? updatedConversation : conversation,
      ),
    }));

    persistConversationBestEffort(updatedConversation);

    cancelConversationRename();
  };

  const selectConversation = (conversationId: string) => {
    setAssistantError(null);
    updateAssistantState((previous) => ({
      ...previous,
      activeConversationId: conversationId,
    }));
  };

  const deleteConversation = (conversationId: string) => {
    updateAssistantState((previous) => {
      const remaining = previous.conversations.filter(
        (conversation) => conversation.id !== conversationId,
      );

      if (remaining.length === 0) {
        const fallback = createEmptyConversation();
        return {
          ...previous,
          activeConversationId: fallback.id,
          conversations: [fallback],
        };
      }

      const activeConversationId =
        previous.activeConversationId === conversationId
          ? remaining[0].id
          : previous.activeConversationId;

      return {
        ...previous,
        activeConversationId,
        conversations: remaining,
      };
    });

    if (renamingConversationId === conversationId) {
      cancelConversationRename();
    }

    removeConversationBestEffort(conversationId);
  };

  return {
    assistantState,
    activeConversation,
    sortedAssistantConversations,
    renamingConversationId,
    renameValue,
    assistantError,
    isSendingMessage,
    streamingThinking,
    setProvider,
    setModel,
    setRenameValue,
    createConversation,
    sendPrompt,
    selectConversation,
    startConversationRename,
    saveConversationRename,
    cancelConversationRename,
    toggleConversationPinned,
    deleteConversation,
  };
}
