import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AssistantConversation } from "@/lib/assistant-storage";
import { Check, Pencil, Plus, Star, Trash2, X } from "lucide-react";

export function AppSidebarAssistantSection(params: {
  conversations: AssistantConversation[];
  activeConversationId: string | null;
  renamingConversationId: string | null;
  renameValue: string;
  onRenameValueChange: (nextValue: string) => void;
  onCreateConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
  onStartRename: (conversationId: string, currentTitle: string) => void;
  onSaveRename: (conversationId: string) => void;
  onCancelRename: () => void;
  onTogglePinned: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
}) {
  const {
    conversations,
    activeConversationId,
    renamingConversationId,
    renameValue,
    onRenameValueChange,
    onCreateConversation,
    onSelectConversation,
    onStartRename,
    onSaveRename,
    onCancelRename,
    onTogglePinned,
    onDeleteConversation,
  } = params;

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
          {conversations.map((conversation) => {
            const lastMessage =
              conversation.messages[conversation.messages.length - 1];
            const isActive = activeConversationId === conversation.id;

            return (
              <div
                key={conversation.id}
                className={`group rounded-md border p-2 ${
                  isActive
                    ? "bg-sidebar-accent border-sidebar-border"
                    : "bg-sidebar"
                }`}
              >
                {renamingConversationId === conversation.id ? (
                  <div className="space-y-1">
                    <Input
                      value={renameValue}
                      onChange={(event) =>
                        onRenameValueChange(event.target.value)
                      }
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
                        <Star
                          className={conversation.pinned ? "fill-current" : ""}
                        />
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
          })}
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
