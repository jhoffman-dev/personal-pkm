import { useNotesTabsStore } from "@/features/notes/state";
import type { EntityId } from "@/data/types";

export function useNotesTabsFacade() {
  const openTabIds = useNotesTabsStore((state) => state.openTabIds);
  const activeTabId = useNotesTabsStore((state) => state.activeTabId);
  const openNoteTab = useNotesTabsStore((state) => state.openNoteTab);
  const setActiveTab = useNotesTabsStore((state) => state.setActiveTab);
  const replaceActiveTab = useNotesTabsStore((state) => state.replaceActiveTab);
  const closeNoteTab = useNotesTabsStore((state) => state.closeNoteTab);
  const setOpenTabs = useNotesTabsStore((state) => state.setOpenTabs);
  const clearTabs = useNotesTabsStore((state) => state.clearTabs);

  return {
    openTabIds,
    activeTabId,
    openNoteTab,
    setActiveTab,
    replaceActiveTab,
    closeNoteTab,
    setOpenTabs,
    clearTabs,
  };
}

export const notesTabsFacade = {
  openNoteTab(params: { id: EntityId; activate?: boolean }) {
    useNotesTabsStore.getState().openNoteTab(params);
  },
  setActiveTab(id: EntityId | null) {
    useNotesTabsStore.getState().setActiveTab(id);
  },
  replaceActiveTab(nextId: EntityId) {
    useNotesTabsStore.getState().replaceActiveTab(nextId);
  },
  closeNoteTab(id: EntityId) {
    useNotesTabsStore.getState().closeNoteTab(id);
  },
  setOpenTabs(ids: EntityId[]) {
    useNotesTabsStore.getState().setOpenTabs(ids);
  },
  clearTabs() {
    useNotesTabsStore.getState().clearTabs();
  },
};
