import type { Note, UpdateNoteInput } from "@/data/entities";
import { equalSet } from "@/lib/entity-link-utils";
import { DEFAULT_NOTE_BODY, DEFAULT_NOTE_TITLE } from "@/lib/note-defaults";

export type NoteDraftState = {
  title: string;
  body: string;
  tags: string[];
  relatedNoteIds: string[];
  personIds: string[];
  companyIds: string[];
  projectIds: string[];
  taskIds: string[];
  meetingIds: string[];
};

export function createNoteDraftState(note: Note | null): NoteDraftState {
  if (!note) {
    return {
      title: DEFAULT_NOTE_TITLE,
      body: DEFAULT_NOTE_BODY,
      tags: [],
      relatedNoteIds: [],
      personIds: [],
      companyIds: [],
      projectIds: [],
      taskIds: [],
      meetingIds: [],
    };
  }

  return {
    title: note.title || DEFAULT_NOTE_TITLE,
    body: note.body,
    tags: note.tags ?? [],
    relatedNoteIds: note.relatedNoteIds ?? [],
    personIds: note.personIds ?? [],
    companyIds: note.companyIds ?? [],
    projectIds: note.projectIds ?? [],
    taskIds: note.taskIds ?? [],
    meetingIds: note.meetingIds ?? [],
  };
}

export function hasNoteDraftChanges(params: {
  note: Note;
  draft: NoteDraftState;
}): boolean {
  const { note, draft } = params;

  if (draft.title !== note.title) {
    return true;
  }

  if (draft.body !== note.body) {
    return true;
  }

  if (!equalSet(draft.tags, note.tags ?? [])) {
    return true;
  }

  if (!equalSet(draft.relatedNoteIds, note.relatedNoteIds ?? [])) {
    return true;
  }

  if (!equalSet(draft.personIds, note.personIds ?? [])) {
    return true;
  }

  if (!equalSet(draft.companyIds, note.companyIds ?? [])) {
    return true;
  }

  if (!equalSet(draft.projectIds, note.projectIds ?? [])) {
    return true;
  }

  if (!equalSet(draft.taskIds, note.taskIds ?? [])) {
    return true;
  }

  if (!equalSet(draft.meetingIds, note.meetingIds ?? [])) {
    return true;
  }

  return false;
}

export function buildNoteUpdateInputFromDraft(
  draft: NoteDraftState,
): UpdateNoteInput {
  return {
    title: draft.title,
    body: draft.body,
    tags: draft.tags,
    relatedNoteIds: draft.relatedNoteIds,
    personIds: draft.personIds,
    companyIds: draft.companyIds,
    projectIds: draft.projectIds,
    taskIds: draft.taskIds,
    meetingIds: draft.meetingIds,
  };
}
