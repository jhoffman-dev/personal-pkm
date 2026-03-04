import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  getSidebarOpenTargetFromModifierKeys,
  type AppSidebarOpenTarget,
} from "@/blocks/app-sidebar/app-sidebar-open-target";
import { DEFAULT_NOTE_TITLE } from "@/lib/note-defaults";

export function AppSidebarNotesSection(params: {
  notes: Array<{ id: string; title: string }>;
  activeTabId: string | null;
  onSelectNote: (noteId: string, openTarget: AppSidebarOpenTarget) => void;
  onDeleteNote: (noteId: string) => void | Promise<void>;
}) {
  const { notes, activeTabId, onSelectNote, onDeleteNote } = params;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Notes</SidebarGroupLabel>
      <SidebarGroupContent>
        {notes.length === 0 ? (
          <p className="text-sidebar-foreground/70 px-2 py-1 text-xs">
            No notes yet.
          </p>
        ) : (
          <SidebarMenu>
            {notes.map((note) => (
              <SidebarMenuItem key={note.id}>
                <SidebarMenuButton
                  isActive={activeTabId === note.id}
                  onClick={(event) => {
                    onSelectNote(
                      note.id,
                      getSidebarOpenTargetFromModifierKeys({
                        altKey: event.altKey,
                        metaKey: event.metaKey,
                        ctrlKey: event.ctrlKey,
                      }),
                    );
                  }}
                  onAuxClick={(event) => {
                    if (event.button !== 1) {
                      return;
                    }

                    onSelectNote(note.id, "active-pane-new-tab");
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    void onDeleteNote(note.id);
                  }}
                >
                  <span>{note.title || DEFAULT_NOTE_TITLE}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
