import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { DEFAULT_NOTE_TITLE } from "@/lib/note-defaults";

export function AppSidebarNotesSection(params: {
  notes: Array<{ id: string; title: string }>;
  activeTabId: string | null;
  onSelectNote: (noteId: string) => void;
  onOpenNoteBackground: (noteId: string) => void;
}) {
  const { notes, activeTabId, onSelectNote, onOpenNoteBackground } = params;

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
                    const openInBackgroundTab = event.metaKey || event.ctrlKey;

                    if (openInBackgroundTab) {
                      onOpenNoteBackground(note.id);
                      return;
                    }

                    onSelectNote(note.id);
                  }}
                  onAuxClick={(event) => {
                    if (event.button !== 1) {
                      return;
                    }

                    onOpenNoteBackground(note.id);
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
