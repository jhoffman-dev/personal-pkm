import {
  DEFAULT_NOTES_TAB_SCOPE_ID,
  selectNotesTabScopeState,
  useNotesTabsStore,
} from "@/features/notes/state";
import type { EntityId } from "@/data/types";
import { useCallback } from "react";

export function useNotesTabsFacade(scopeId?: string) {
  const activeScopeId = useNotesTabsStore((state) => state.activeScopeId);
  const resolvedScopeId =
    scopeId ?? activeScopeId ?? DEFAULT_NOTES_TAB_SCOPE_ID;

  const openTabIds = useNotesTabsStore(
    (state) => selectNotesTabScopeState(state, resolvedScopeId).openTabIds,
  );
  const activeTabId = useNotesTabsStore(
    (state) => selectNotesTabScopeState(state, resolvedScopeId).activeTabId,
  );

  const setActiveScope = useNotesTabsStore((state) => state.setActiveScope);
  const openNoteTab = useNotesTabsStore((state) => state.openNoteTab);
  const setActiveTab = useNotesTabsStore((state) => state.setActiveTab);
  const replaceActiveTab = useNotesTabsStore((state) => state.replaceActiveTab);
  const closeNoteTab = useNotesTabsStore((state) => state.closeNoteTab);
  const setOpenTabs = useNotesTabsStore((state) => state.setOpenTabs);
  const clearTabs = useNotesTabsStore((state) => state.clearTabs);

  const openNoteTabForScope = useCallback(
    (params: { id: EntityId; activate?: boolean }) => {
      openNoteTab(params, resolvedScopeId);
    },
    [openNoteTab, resolvedScopeId],
  );
  const setActiveTabForScope = useCallback(
    (id: EntityId | null) => {
      setActiveTab(id, resolvedScopeId);
    },
    [resolvedScopeId, setActiveTab],
  );
  const replaceActiveTabForScope = useCallback(
    (nextId: EntityId) => {
      replaceActiveTab(nextId, resolvedScopeId);
    },
    [replaceActiveTab, resolvedScopeId],
  );
  const closeNoteTabForScope = useCallback(
    (id: EntityId) => {
      closeNoteTab(id, resolvedScopeId);
    },
    [closeNoteTab, resolvedScopeId],
  );
  const setOpenTabsForScope = useCallback(
    (ids: EntityId[]) => {
      setOpenTabs(ids, resolvedScopeId);
    },
    [resolvedScopeId, setOpenTabs],
  );
  const clearTabsForScope = useCallback(() => {
    clearTabs(resolvedScopeId);
  }, [clearTabs, resolvedScopeId]);

  return {
    activeScopeId,
    scopeId: resolvedScopeId,
    openTabIds,
    activeTabId,
    setActiveScope,
    openNoteTab: openNoteTabForScope,
    setActiveTab: setActiveTabForScope,
    replaceActiveTab: replaceActiveTabForScope,
    closeNoteTab: closeNoteTabForScope,
    setOpenTabs: setOpenTabsForScope,
    clearTabs: clearTabsForScope,
  };
}

export const notesTabsFacade = {
  setActiveScope(scopeId: string) {
    useNotesTabsStore.getState().setActiveScope(scopeId);
  },
  openNoteTab(params: { id: EntityId; activate?: boolean }, scopeId?: string) {
    useNotesTabsStore.getState().openNoteTab(params, scopeId);
  },
  setActiveTab(id: EntityId | null, scopeId?: string) {
    useNotesTabsStore.getState().setActiveTab(id, scopeId);
  },
  replaceActiveTab(nextId: EntityId, scopeId?: string) {
    useNotesTabsStore.getState().replaceActiveTab(nextId, scopeId);
  },
  closeNoteTab(id: EntityId, scopeId?: string) {
    useNotesTabsStore.getState().closeNoteTab(id, scopeId);
  },
  setOpenTabs(ids: EntityId[], scopeId?: string) {
    useNotesTabsStore.getState().setOpenTabs(ids, scopeId);
  },
  clearTabs(scopeId?: string) {
    useNotesTabsStore.getState().clearTabs(scopeId);
  },
};
