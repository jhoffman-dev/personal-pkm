import { notesEntityStateFacade, useNotesEntityStore } from "@/features/notes";
import { beforeEach, describe, expect, it } from "vitest";

describe("notes entity state facade", () => {
  beforeEach(() => {
    notesEntityStateFacade.setSelectedNoteId(null);
  });

  it("sets selected note id through facade command", () => {
    notesEntityStateFacade.setSelectedNoteId("note-1");

    expect(useNotesEntityStore.getState().selectedNoteId).toBe("note-1");
  });
});
