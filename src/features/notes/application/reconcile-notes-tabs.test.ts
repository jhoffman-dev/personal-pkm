import { reconcileNotesTabs } from "@/features/notes/application/reconcile-notes-tabs";
import { describe, expect, it } from "vitest";

describe("reconcileNotesTabs", () => {
  it("returns null when notes are not succeeded", () => {
    const result = reconcileNotesTabs({
      notesStatus: "loading",
      noteIds: ["n1"],
      openTabIds: ["n1"],
      activeTabId: "n1",
      sortedNoteIds: ["n1"],
    });

    expect(result).toBeNull();
  });

  it("requests open tab cleanup when invalid tabs exist", () => {
    const result = reconcileNotesTabs({
      notesStatus: "succeeded",
      noteIds: ["n1"],
      openTabIds: ["n1", "missing"],
      activeTabId: "n1",
      sortedNoteIds: ["n1"],
    });

    expect(result).toEqual({ type: "set-open-tabs", openTabIds: ["n1"] });
  });

  it("requests active tab fallback when active id is invalid", () => {
    const result = reconcileNotesTabs({
      notesStatus: "succeeded",
      noteIds: ["n1", "n2"],
      openTabIds: ["n2"],
      activeTabId: "missing",
      sortedNoteIds: ["n1", "n2"],
    });

    expect(result).toEqual({ type: "set-active-tab", activeTabId: "n2" });
  });

  it("opens fallback tab when none active", () => {
    const result = reconcileNotesTabs({
      notesStatus: "succeeded",
      noteIds: ["n1", "n2"],
      openTabIds: [],
      activeTabId: null,
      sortedNoteIds: ["n2", "n1"],
    });

    expect(result).toEqual({ type: "open-note-tab", id: "n2", activate: true });
  });
});
