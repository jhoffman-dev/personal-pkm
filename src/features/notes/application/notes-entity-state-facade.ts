import { useNotesEntityStore } from "@/features/notes/state";
import { useMemo } from "react";

export function useNotesEntityStateFacade() {
  const runtimeNotesState = useNotesEntityStore((state) => state.notesState);
  const selectedNoteId = useNotesEntityStore((state) => state.selectedNoteId);
  const setSelectedNoteIdInStore = useNotesEntityStore(
    (state) => state.setSelectedNoteId,
  );

  const notesState = useMemo(
    () => ({
      ...runtimeNotesState,
      selectedId: selectedNoteId,
    }),
    [runtimeNotesState, selectedNoteId],
  );

  const setSelectedNoteId = (noteId: string | null) => {
    setSelectedNoteIdInStore(noteId);
  };

  return {
    notesState,
    setSelectedNoteId,
  };
}

export const notesEntityStateFacade = {
  setSelectedNoteId(noteId: string | null) {
    useNotesEntityStore.getState().setSelectedNoteId(noteId);
  },
};
