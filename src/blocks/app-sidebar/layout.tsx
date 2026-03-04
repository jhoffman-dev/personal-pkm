import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/blocks/app-sidebar/app-sidebar";
import { AppBar } from "@/components/app-bar";
import { DevRouteTimingPanel } from "@/components/dev-route-timing-panel";
import { Button } from "@/components/ui/button";
import { createEmptyNoteInput } from "@/lib/note-defaults";
import { getRouteTitle } from "@/routes/navigation";
import { prefetchRouteModule } from "@/routes/route-module-loaders";
import { useAppDispatch } from "@/store";
import {
  notesDataRuntime,
  useNotesEntityStateFacade,
  useNotesTabsFacade,
} from "@/features/notes";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

export default function Layout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const title = getRouteTitle(pathname);
  const { openNoteTab } = useNotesTabsFacade();
  const { setSelectedNoteId } = useNotesEntityStateFacade();
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  const createNoteWithTimeout = async (timeoutMs: number) => {
    const createPromise = notesDataRuntime.createOne(
      dispatch,
      createEmptyNoteInput(),
    );

    const timeoutPromise = new Promise<never>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error("Timed out while creating note"));
      }, timeoutMs);
    });

    return Promise.race([createPromise, timeoutPromise]);
  };

  const handleCreateNote = async () => {
    if (isCreatingNote) {
      return;
    }

    setIsCreatingNote(true);
    try {
      const note = await createNoteWithTimeout(15000);
      openNoteTab({ id: note.id, activate: true });
      setSelectedNoteId(note.id);
      navigate("/notes");
    } catch (error) {
      console.error("Failed to create note:", error);
      window.alert(
        "Unable to create note right now. Please check your connection and Firestore rules, then try again.",
      );
    } finally {
      setIsCreatingNote(false);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppBar title={title} />
        <Outlet />
        <Button
          type="button"
          size="icon"
          className="fixed right-6 bottom-6 z-50 size-12 rounded-full"
          onMouseEnter={() => {
            prefetchRouteModule("/notes");
          }}
          onFocus={() => {
            prefetchRouteModule("/notes");
          }}
          onClick={() => {
            void handleCreateNote();
          }}
          disabled={isCreatingNote}
          aria-label="Create new note"
        >
          <Plus className="size-5" />
        </Button>
        {import.meta.env.DEV ? <DevRouteTimingPanel /> : null}
      </SidebarInset>
    </SidebarProvider>
  );
}
