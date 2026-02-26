import type { Note } from "@/data/entities";

export function resolveMainTaskNote(params: {
  currentTitle: string;
  linkedNoteIds: string[];
  noteById: Record<string, Note | undefined>;
  allNoteIds: string[];
}): Note | null {
  const { currentTitle, linkedNoteIds, noteById, allNoteIds } = params;

  const linkedCandidates = linkedNoteIds
    .map((id) => noteById[id])
    .filter((note): note is Note => Boolean(note));

  const linkedTitleMatch = linkedCandidates.find(
    (note) => note.title === currentTitle,
  );

  const globalTitleMatch = allNoteIds
    .map((id) => noteById[id])
    .filter((note): note is Note => Boolean(note))
    .filter((note) => note.title === currentTitle)
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() -
        new Date(left.updatedAt).getTime(),
    )[0];

  return linkedTitleMatch ?? linkedCandidates[0] ?? globalTitleMatch ?? null;
}
