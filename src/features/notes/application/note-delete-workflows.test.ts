import {
  buildDeleteCurrentNotePlan,
  buildDeleteSameTitleNotesPlan,
  runNoteDeleteWorkflow,
} from "@/features/notes/application/note-delete-workflows";
import { describe, expect, it, vi } from "vitest";

describe("note-delete-workflows", () => {
  it("builds current note delete plan", () => {
    const plan = buildDeleteCurrentNotePlan({ id: "n1", title: "Hello" });

    expect(plan?.noteIds).toEqual(["n1"]);
    expect(plan?.confirmationMessage).toContain('Delete note "Hello"?');
  });

  it("builds same-title delete plan", () => {
    const plan = buildDeleteSameTitleNotesPlan({
      selectedNote: { title: "Same" },
      sortedNotes: [
        { id: "a", title: "Same" },
        { id: "b", title: "Other" },
        { id: "c", title: "Same" },
      ],
    });

    expect(plan?.noteIds).toEqual(["a", "c"]);
    expect(plan?.confirmationMessage).toContain("Delete 2 note(s)");
  });

  it("runs workflow with confirm and toggles deleting state", async () => {
    const setIsDeleting = vi.fn();
    const deleteByIds = vi.fn(async () => {});

    const result = await runNoteDeleteWorkflow({
      isDeleting: false,
      plan: {
        noteIds: ["n1"],
        confirmationMessage: "confirm",
      },
      confirm: () => true,
      deleteByIds,
      setIsDeleting,
    });

    expect(result).toBe(true);
    expect(deleteByIds).toHaveBeenCalledWith(["n1"]);
    expect(setIsDeleting).toHaveBeenCalledTimes(2);
    expect(setIsDeleting).toHaveBeenNthCalledWith(1, true);
    expect(setIsDeleting).toHaveBeenNthCalledWith(2, false);
  });

  it("short-circuits when not confirmed", async () => {
    const deleteByIds = vi.fn(async () => {});
    const setIsDeleting = vi.fn();

    const result = await runNoteDeleteWorkflow({
      isDeleting: false,
      plan: {
        noteIds: ["n1"],
        confirmationMessage: "confirm",
      },
      confirm: () => false,
      deleteByIds,
      setIsDeleting,
    });

    expect(result).toBe(false);
    expect(deleteByIds).not.toHaveBeenCalled();
    expect(setIsDeleting).not.toHaveBeenCalled();
  });
});
