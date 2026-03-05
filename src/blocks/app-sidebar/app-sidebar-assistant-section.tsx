import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type {
  AssistantConversation,
  AssistantProvider,
} from "@/lib/assistant-storage";
import {
  Check,
  ChevronDown,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  X,
} from "lucide-react";

export function AppSidebarAssistantSection(params: {
  conversations: AssistantConversation[];
  activeConversation?: AssistantConversation | null;
  activeConversationId: string | null;
  provider?: AssistantProvider;
  model?: string;
  availableModels?: string[];
  isLoadingModels?: boolean;
  modelsError?: string | null;
  renamingConversationId: string | null;
  renameValue: string;
  variant?: "list" | "chat";
  isSending?: boolean;
  isGeminiKeyConfigured?: boolean;
  errorMessage?: string | null;
  streamingThinking?: string;
  onRenameValueChange: (nextValue: string) => void;
  onCreateConversation: () => void;
  onSendPrompt?: (prompt: string) => void | Promise<void>;
  onProviderChange?: (provider: AssistantProvider) => void;
  onModelChange?: (model: string) => void;
  onRefreshModels?: () => void;
  onSelectConversation: (conversationId: string) => void;
  onStartRename: (conversationId: string, currentTitle: string) => void;
  onSaveRename: (conversationId: string) => void;
  onCancelRename: () => void;
  onTogglePinned: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
}) {
  const {
    conversations,
    activeConversation,
    activeConversationId,
    provider = "ollama",
    model = "",
    availableModels = [],
    isLoadingModels = false,
    modelsError,
    renamingConversationId,
    renameValue,
    variant = "list",
    isSending = false,
    isGeminiKeyConfigured = false,
    errorMessage,
    streamingThinking,
    onRenameValueChange,
    onCreateConversation,
    onSendPrompt,
    onProviderChange,
    onModelChange,
    onRefreshModels,
    onSelectConversation,
    onStartRename,
    onSaveRename,
    onCancelRename,
    onTogglePinned,
    onDeleteConversation,
  } = params;

  const [promptValue, setPromptValue] = React.useState("");
  const [isHistoryDropdownOpen, setIsHistoryDropdownOpen] =
    React.useState(false);
  const modelSuggestionsId = React.useMemo(
    () => `assistant-model-suggestions-${provider}`,
    [provider],
  );
  const messagesContainerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (variant !== "chat") {
      return;
    }

    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [
    activeConversation?.id,
    activeConversation?.messages.length,
    isSending,
    streamingThinking,
    variant,
  ]);

  const submitPrompt = () => {
    const value = promptValue.trim();
    if (!value || !onSendPrompt || isSending) {
      return;
    }

    setPromptValue("");
    void onSendPrompt(value);
  };

  const renderConversationRow = (conversation: AssistantConversation) => {
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const isActive = activeConversationId === conversation.id;

    return (
      <div
        key={conversation.id}
        className={`group rounded-md border p-2 ${
          isActive ? "bg-sidebar-accent border-sidebar-border" : "bg-sidebar"
        }`}
      >
        {renamingConversationId === conversation.id ? (
          <div className="space-y-1">
            <Input
              value={renameValue}
              onChange={(event) => onRenameValueChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSaveRename(conversation.id);
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  onCancelRename();
                }
              }}
              className="h-7"
              autoFocus
            />
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onSaveRename(conversation.id)}
                aria-label="Save conversation name"
              >
                <Check />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onCancelRename}
                aria-label="Cancel rename"
              >
                <X />
              </Button>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="w-full min-w-0 text-left"
              onClick={() => onSelectConversation(conversation.id)}
            >
              <p className="truncate text-sm font-medium">
                {conversation.title}
              </p>
              <p className="text-sidebar-foreground/70 truncate text-xs">
                {lastMessage?.content ?? "No messages yet"}
              </p>
            </button>

            <div className="mt-1 flex items-center justify-end gap-0.5">
              <Button
                variant="ghost"
                size="icon-xs"
                className="opacity-80 group-hover:opacity-100"
                onClick={(event) => {
                  event.stopPropagation();
                  onStartRename(conversation.id, conversation.title);
                }}
                aria-label="Rename conversation"
              >
                <Pencil />
              </Button>

              <Button
                variant="ghost"
                size="icon-xs"
                className={conversation.pinned ? "text-primary" : ""}
                onClick={(event) => {
                  event.stopPropagation();
                  onTogglePinned(conversation.id);
                }}
                aria-label={
                  conversation.pinned
                    ? "Unpin conversation"
                    : "Pin conversation"
                }
              >
                <Star className={conversation.pinned ? "fill-current" : ""} />
              </Button>

              <Button
                variant="ghost"
                size="icon-xs"
                className="text-destructive opacity-80 group-hover:opacity-100"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteConversation(conversation.id);
                }}
                aria-label="Delete conversation"
              >
                <Trash2 />
              </Button>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderConversationHistoryOption = (
    conversation: AssistantConversation,
  ) => {
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const isActive = activeConversationId === conversation.id;

    return (
      <button
        key={conversation.id}
        type="button"
        className={`w-full rounded-md border px-2.5 py-2 text-left ${
          isActive
            ? "bg-sidebar-accent border-sidebar-border"
            : "bg-sidebar hover:bg-sidebar-accent/60"
        }`}
        onClick={() => {
          onSelectConversation(conversation.id);
          setIsHistoryDropdownOpen(false);
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-medium">{conversation.title}</p>
          {conversation.pinned ? (
            <Star className="text-primary size-3 shrink-0 fill-current" />
          ) : null}
        </div>
        <p className="text-sidebar-foreground/70 mt-1 truncate text-[11px]">
          {lastMessage?.content ?? "No messages yet"}
        </p>
      </button>
    );
  };

  if (variant === "chat") {
    return (
      <SidebarGroup className="h-full min-h-0 p-2">
        <SidebarGroupLabel className="flex items-center justify-between pr-2">
          <span>Assistant</span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onCreateConversation}
            aria-label="Create conversation"
          >
            <Plus />
          </Button>
        </SidebarGroupLabel>

        <SidebarGroupContent className="flex min-h-0 flex-1 flex-col gap-2 px-1 pb-0">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <select
                value={provider}
                onChange={(event) => {
                  onProviderChange?.(event.target.value as AssistantProvider);
                }}
                className="border-input bg-background h-8 w-28 rounded-md border px-2 text-xs"
                disabled={!onProviderChange || isSending}
              >
                <option value="ollama">Ollama</option>
                <option value="gemini">Gemini</option>
                {provider === "vertex" ? (
                  <option value="vertex">Vertex</option>
                ) : null}
              </select>

              <div className="flex min-w-0 flex-1 items-center gap-1">
                <Input
                  value={model}
                  onChange={(event) => {
                    onModelChange?.(event.target.value);
                  }}
                  placeholder="Model"
                  list={modelSuggestionsId}
                  className="h-8 min-w-0 flex-1 text-xs"
                  disabled={!onModelChange || isSending}
                />
                {availableModels.length > 0 ? (
                  <datalist id={modelSuggestionsId}>
                    {availableModels.map((availableModel) => (
                      <option key={availableModel} value={availableModel} />
                    ))}
                  </datalist>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="h-8 w-8 shrink-0"
                  onClick={onRefreshModels}
                  disabled={!onRefreshModels || isLoadingModels || isSending}
                  aria-label="Refresh model list"
                >
                  <RefreshCw
                    className={`size-3.5 ${isLoadingModels ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            </div>

            {isLoadingModels ? (
              <p className="text-sidebar-foreground/70 px-1 text-[11px]">
                Loading model list...
              </p>
            ) : null}

            {modelsError ? (
              <p className="text-destructive px-1 text-[11px]">{modelsError}</p>
            ) : null}

            {provider === "gemini" ? (
              <p
                className={`px-1 text-[11px] ${
                  isGeminiKeyConfigured
                    ? "text-sidebar-foreground/70"
                    : "text-destructive"
                }`}
              >
                Gemini key {isGeminiKeyConfigured ? "configured" : "missing"}
              </p>
            ) : null}

            <DropdownMenu
              open={isHistoryDropdownOpen}
              onOpenChange={setIsHistoryDropdownOpen}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-full justify-between px-2 text-xs"
                >
                  <span className="truncate text-left">
                    {activeConversation?.title ?? "Conversation history"}
                  </span>
                  <ChevronDown className="size-3.5 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-80 max-w-[calc(100vw-2rem)] p-1"
              >
                <div className="max-h-72 space-y-1 overflow-y-auto">
                  {conversations.length === 0 ? (
                    <p className="text-muted-foreground px-2 py-1 text-xs">
                      No history yet.
                    </p>
                  ) : (
                    conversations.map((conversation) =>
                      renderConversationHistoryOption(conversation),
                    )
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div
            ref={messagesContainerRef}
            className="bg-sidebar-accent/40 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-md border p-2"
          >
            {activeConversation?.messages.length ? (
              activeConversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[92%] rounded-md px-2.5 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground ml-auto"
                      : "bg-sidebar border"
                  }`}
                >
                  {message.content || (isSending ? "..." : "")}
                </div>
              ))
            ) : (
              <p className="text-sidebar-foreground/70 px-1 py-1 text-xs">
                Start a conversation from this sidebar.
              </p>
            )}

            {isSending ? (
              <div className="bg-sidebar border text-sidebar-foreground/80 max-w-[92%] rounded-md px-2.5 py-2 text-xs">
                {streamingThinking || "Thinking..."}
              </div>
            ) : null}
          </div>

          {errorMessage ? (
            <p className="text-destructive px-1 text-xs">{errorMessage}</p>
          ) : null}

          <div className="flex items-center gap-1.5">
            <Input
              value={promptValue}
              onChange={(event) => setPromptValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitPrompt();
                }
              }}
              placeholder="Ask Copilot..."
              disabled={isSending}
              className="h-8"
            />
            <Button
              type="button"
              size="sm"
              className="h-8 px-2.5 text-xs"
              onClick={submitPrompt}
              disabled={isSending || promptValue.trim().length === 0}
            >
              {isSending ? "..." : "Send"}
            </Button>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center justify-between pr-2">
        <span>Conversations</span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onCreateConversation}
          aria-label="Create conversation"
        >
          <Plus />
        </Button>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <div className="space-y-1 px-2">
          {conversations.map((conversation) =>
            renderConversationRow(conversation),
          )}
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
