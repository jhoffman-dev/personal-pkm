import type { Note } from "@/data/entities";
import type { EntityId } from "@/data/types";
import {
  createInitialEntityRuntimeState,
  type EntityRuntimeState,
} from "@/features/shared/application/entity-runtime-state";
import { create } from "zustand";

export interface NotesEntityStoreState {
  selectedNoteId: EntityId | null;
  notesState: EntityRuntimeState<Note>;
  setSelectedNoteId: (id: EntityId | null) => void;
}

export const useNotesEntityStore = create<NotesEntityStoreState>((set) => ({
  selectedNoteId: null,
  notesState: createInitialEntityRuntimeState<Note>(),
  setSelectedNoteId: (id) => {
    set({ selectedNoteId: id });
  },
}));
