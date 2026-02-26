import type { Note } from "@/data/entities";
import { resolveMainTaskNote } from "@/features/tasks/application/resolve-main-task-note";

export function resolveMainTaskTitle(params: {
  draftTitle: string;
  fallbackTitle: string;
}): string {
  return params.draftTitle.trim() || params.fallbackTitle.trim();
}

export function selectMainTaskNote(params: {
  mainNoteId: string | null;
  noteById: Record<string, Note | undefined>;
  currentTitle: string;
  linkedNoteIds: string[];
  allNoteIds: string[];
}): Note | null {
  const { mainNoteId, noteById, currentTitle, linkedNoteIds, allNoteIds } =
    params;

  if (mainNoteId && noteById[mainNoteId]) {
    return noteById[mainNoteId] ?? null;
  }

  return resolveMainTaskNote({
    currentTitle,
    linkedNoteIds,
    noteById,
    allNoteIds,
  });
}

export function mergeMainNoteId(
  noteIds: string[],
  mainNoteId: string | null,
): string[] {
  if (!mainNoteId || noteIds.includes(mainNoteId)) {
    return noteIds;
  }

  return [...noteIds, mainNoteId];
}
