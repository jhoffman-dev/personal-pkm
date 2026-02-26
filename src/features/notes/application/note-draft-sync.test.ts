import type { Note } from "@/data/entities";
import {
  buildNoteUpdateInputFromDraft,
  createNoteDraftState,
  hasNoteDraftChanges,
} from "@/features/notes/application/note-draft-sync";
import { describe, expect, it } from "vitest";

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "n1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    title: "Note",
    body: "<p>Hello</p>",
    tags: ["a"],
    relatedNoteIds: ["n2"],
    personIds: ["p1"],
    companyIds: ["c1"],
    projectIds: ["pr1"],
    taskIds: ["t1"],
    meetingIds: ["m1"],
    ...overrides,
  };
}

describe("note-draft-sync", () => {
  it("creates default draft when note is null", () => {
    const draft = createNoteDraftState(null);
    expect(draft.title).toBe("Untitled note");
    expect(draft.body).toContain("<h1>");
    expect(draft.tags).toEqual([]);
  });

  it("detects draft changes", () => {
    const note = makeNote();
    const sameDraft = createNoteDraftState(note);
    const changedDraft = {
      ...sameDraft,
      body: "<p>Updated</p>",
    };

    expect(hasNoteDraftChanges({ note, draft: sameDraft })).toBe(false);
    expect(hasNoteDraftChanges({ note, draft: changedDraft })).toBe(true);
  });

  it("builds note update input from draft", () => {
    const draft = createNoteDraftState(makeNote());
    const input = buildNoteUpdateInputFromDraft(draft);

    expect(input.title).toBe("Note");
    expect(input.relatedNoteIds).toEqual(["n2"]);
    expect(input.taskIds).toEqual(["t1"]);
  });
});
