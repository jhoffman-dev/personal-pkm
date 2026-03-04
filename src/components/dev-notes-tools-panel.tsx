import { useMemo, useState } from "react";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  buildDeleteSameTitleNotesPlan,
  notesDataRuntime,
  runNoteDeleteWorkflow,
  useNotesEntityStateFacade,
} from "@/features/notes";
import { DEFAULT_NOTE_TITLE } from "@/lib/note-defaults";
import { useAppDispatch } from "@/store";

export function DevNotesToolsPanel() {
  const dispatch = useAppDispatch();
  const { notesState } = useNotesEntityStateFacade();
  const [isDeletingNotes, setIsDeletingNotes] = useState(false);

  const sortedNotes = useMemo(
    () =>
      notesState.ids
        .map((id) => notesState.entities[id])
        .filter(Boolean)
        .sort((a, b) => {
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        }),
    [notesState.entities, notesState.ids],
  );

  const selectedNote = notesState.selectedId
    ? notesState.entities[notesState.selectedId]
    : null;

  const notesWithSameTitleCount = useMemo(() => {
    if (!selectedNote) {
      return 0;
    }

    return sortedNotes.filter((note) => note.title === selectedNote.title)
      .length;
  }, [selectedNote, sortedNotes]);

  const selectedNoteTitle = selectedNote?.title || DEFAULT_NOTE_TITLE;

  const deleteNotesWithSameTitle = async () => {
    const plan = buildDeleteSameTitleNotesPlan({
      selectedNote,
      sortedNotes,
    });

    await runNoteDeleteWorkflow({
      isDeleting: isDeletingNotes,
      plan,
      confirm: (message) => window.confirm(message),
      deleteByIds: async (noteIds) => {
        await Promise.all(
          noteIds.map((id) => notesDataRuntime.deleteOne(dispatch, id)),
        );
      },
      setIsDeleting: setIsDeletingNotes,
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Dev Tools</p>
          <p className="text-muted-foreground text-xs">
            Notes maintenance actions.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="self-start"
          onClick={() => {
            void deleteNotesWithSameTitle();
          }}
          disabled={
            !selectedNote || isDeletingNotes || notesWithSameTitleCount < 2
          }
        >
          <Trash2 className="size-4" />
          Delete same title ({notesWithSameTitleCount})
        </Button>
        <p className="text-muted-foreground text-xs">
          {selectedNote
            ? `Selected note: "${selectedNoteTitle}"`
            : "Select a note to enable note-specific dev actions."}
        </p>
      </div>
    </div>
  );
}
