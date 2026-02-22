import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/blocks/app-sidebar/app-sidebar";
import { AppBar } from "@/components/app-bar";
import { Button } from "@/components/ui/button";
import { createEmptyNoteInput } from "@/lib/note-defaults";
import { getRouteTitle } from "@/routes/navigation";
import {
  dataActions,
  dataThunks,
  notesTabsActions,
  useAppDispatch,
} from "@/store";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

export default function Layout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const title = getRouteTitle(pathname);
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  const handleCreateNote = async () => {
    if (isCreatingNote) {
      return;
    }

    setIsCreatingNote(true);
    try {
      const note = await dispatch(
        dataThunks.notes.createOne(createEmptyNoteInput()),
      ).unwrap();
      dispatch(notesTabsActions.openNoteTab({ id: note.id, activate: true }));
      dispatch(dataActions.notes.setSelectedId(note.id));
      navigate("/notes");
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
          onClick={() => {
            void handleCreateNote();
          }}
          disabled={isCreatingNote}
          aria-label="Create new note"
        >
          <Plus className="size-5" />
        </Button>
      </SidebarInset>
    </SidebarProvider>
  );
}
