export {
  buildNoteUpdateInputFromDraft,
  createNoteDraftState,
  hasNoteDraftChanges,
  type NoteDraftState,
} from "@/features/notes/application/note-draft-sync";
export {
  buildNoteBacklinks,
  type BacklinkOption,
  type NoteBacklinks,
} from "@/features/notes/application/build-note-backlinks";
export {
  reconcileNotesTabs,
  type NotesTabsSyncAction,
} from "@/features/notes/application/reconcile-notes-tabs";
export {
  buildDeleteCurrentNotePlan,
  buildDeleteSameTitleNotesPlan,
  runNoteDeleteWorkflow,
  type NoteDeletePlan,
} from "@/features/notes/application/note-delete-workflows";
export {
  notesTabsFacade,
  useNotesTabsFacade,
} from "@/features/notes/application/notes-state-facade";
export {
  notesEntityStateFacade,
  useNotesEntityStateFacade,
} from "@/features/notes/application/notes-entity-state-facade";
export { notesDataRuntime } from "@/features/notes/application/notes-data-runtime";
export { useNotesEntityStore } from "@/features/notes/state";
