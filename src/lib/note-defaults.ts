import type { CreateNoteInput } from "@/data/entities";

export const DEFAULT_NOTE_TITLE = "Untitled note";
export const DEFAULT_NOTE_BODY = `<h1>${DEFAULT_NOTE_TITLE}</h1><p></p>`;

export function createEmptyNoteInput(): CreateNoteInput {
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
