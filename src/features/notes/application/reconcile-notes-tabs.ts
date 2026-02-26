export type NotesTabsSyncAction =
  | { type: "set-open-tabs"; openTabIds: string[] }
  | { type: "set-active-tab"; activeTabId: string | null }
  | { type: "open-note-tab"; id: string; activate: true };

export function reconcileNotesTabs(params: {
  notesStatus: string;
  noteIds: string[];
  openTabIds: string[];
  activeTabId: string | null;
  sortedNoteIds: string[];
}): NotesTabsSyncAction | null {
  if (params.notesStatus !== "succeeded") {
    return null;
  }

  const validIdSet = new Set(params.noteIds);
  const nextOpenTabs = params.openTabIds.filter((id) => validIdSet.has(id));

  if (nextOpenTabs.length !== params.openTabIds.length) {
    return {
      type: "set-open-tabs",
      openTabIds: nextOpenTabs,
    };
  }

  if (params.activeTabId && !validIdSet.has(params.activeTabId)) {
    return {
      type: "set-active-tab",
      activeTabId: nextOpenTabs[0] ?? null,
    };
  }

  if (!params.activeTabId && params.sortedNoteIds.length > 0) {
    return {
      type: "open-note-tab",
      id: nextOpenTabs[0] ?? params.sortedNoteIds[0],
      activate: true,
    };
  }

  return null;
}
