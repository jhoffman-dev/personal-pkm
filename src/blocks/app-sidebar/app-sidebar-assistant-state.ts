import { deleteAssistantChat, upsertAssistantChat } from "@/lib/ai-client";
import {
  ASSISTANT_STORAGE_EVENT,
  type AssistantConversation,
  DEFAULT_CONVERSATION_TITLE,
  createEmptyConversation,
  hydrateAssistantStateFromFirestore,
  loadAssistantState,
  saveAssistantState,
  sortAssistantConversations,
  type StoredAssistantState,
} from "@/lib/assistant-storage";
import { firebaseAuth } from "@/lib/firebase";
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

  const persistConversationBestEffort = (
    conversation: AssistantConversation,
  ) => {
    void persistAssistantConversation(conversation).catch(() => {
      // Keep local in-memory state if persistence fails.
    });
  };

  const removeConversationBestEffort = (conversationId: string) => {
    void removeAssistantConversationFromFirestore(conversationId).catch(() => {
      // Keep local in-memory state if persistence fails.
    });
  };

  const createConversation = () => {
    const conversation = createEmptyConversation();
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
    sortedAssistantConversations,
    renamingConversationId,
    renameValue,
    setRenameValue,
    createConversation,
    selectConversation,
    startConversationRename,
    saveConversationRename,
    cancelConversationRename,
    toggleConversationPinned,
    deleteConversation,
  };
}
