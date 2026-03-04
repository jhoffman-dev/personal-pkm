import { notesTabsFacade } from "@/features/notes";
import { useNotesTabsStore } from "@/features/notes/state";
import { beforeEach, describe, expect, it } from "vitest";

describe("notes state facade", () => {
  beforeEach(() => {
    useNotesTabsStore.setState({
      openTabIds: [],
      activeTabId: null,
    });
  });

  it("opens note tab and activates by default", () => {
    notesTabsFacade.openNoteTab({ id: "n1" });

    const state = useNotesTabsStore.getState();
    expect(state.openTabIds).toEqual(["n1"]);
    expect(state.activeTabId).toBe("n1");
  });

  it("supports replace and close tab operations", () => {
    notesTabsFacade.openNoteTab({ id: "n1" });
    notesTabsFacade.openNoteTab({ id: "n2" });
    notesTabsFacade.replaceActiveTab("n3");

    let state = useNotesTabsStore.getState();
    expect(state.openTabIds).toEqual(["n1", "n3"]);
    expect(state.activeTabId).toBe("n3");

    notesTabsFacade.closeNoteTab("n3");

    state = useNotesTabsStore.getState();
    expect(state.openTabIds).toEqual(["n1"]);
    expect(state.activeTabId).toBe("n1");
  });
});
