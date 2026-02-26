import { DEFAULT_NOTE_TITLE } from "@/lib/note-defaults";

type NoteDeleteSource = {
  id: string;
  title: string;
};

export type NoteDeletePlan = {
  noteIds: string[];
  confirmationMessage: string;
};

export function buildDeleteCurrentNotePlan(
  selectedNote: NoteDeleteSource | null,
): NoteDeletePlan | null {
  if (!selectedNote) {
    return null;
  }

  const title = selectedNote.title || DEFAULT_NOTE_TITLE;
  return {
    noteIds: [selectedNote.id],
    confirmationMessage: `Delete note "${title}"?`,
  };
}

export function buildDeleteSameTitleNotesPlan(params: {
  selectedNote: Pick<NoteDeleteSource, "title"> | null;
  sortedNotes: NoteDeleteSource[];
}): NoteDeletePlan | null {
  const { selectedNote, sortedNotes } = params;
  if (!selectedNote) {
    return null;
  }

  const matchingIds = sortedNotes
    .filter((note) => note.title === selectedNote.title)
    .map((note) => note.id);

  if (matchingIds.length === 0) {
    return null;
  }

  const title = selectedNote.title || DEFAULT_NOTE_TITLE;
  return {
    noteIds: matchingIds,
    confirmationMessage: `Delete ${matchingIds.length} note(s) titled "${title}"?`,
  };
}

export async function runNoteDeleteWorkflow(params: {
  isDeleting: boolean;
  plan: NoteDeletePlan | null;
  confirm: (message: string) => boolean;
  deleteByIds: (noteIds: string[]) => Promise<void>;
  setIsDeleting: (nextValue: boolean) => void;
}): Promise<boolean> {
  if (params.isDeleting || !params.plan) {
    return false;
  }

  const confirmed = params.confirm(params.plan.confirmationMessage);
  if (!confirmed) {
    return false;
  }

  params.setIsDeleting(true);
  try {
    await params.deleteByIds(params.plan.noteIds);
    return true;
  } finally {
    params.setIsDeleting(false);
  }
}
