import type { EntityId } from "@/data/types";
import { create } from "zustand";

const NOTES_TABS_STORAGE_KEY = "pkm.notes.tabs.v1";

export interface NotesTabsStoreState {
  openTabIds: EntityId[];
  activeTabId: EntityId | null;
  openNoteTab: (params: { id: EntityId; activate?: boolean }) => void;
  setActiveTab: (id: EntityId | null) => void;
  replaceActiveTab: (nextId: EntityId) => void;
  closeNoteTab: (id: EntityId) => void;
  setOpenTabs: (ids: EntityId[]) => void;
  clearTabs: () => void;
}

function loadInitialNotesTabsState(): Pick<
  NotesTabsStoreState,
  "openTabIds" | "activeTabId"
> {
  if (typeof window === "undefined") {
    return {
      openTabIds: [],
      activeTabId: null,
    };
  }

  const raw = window.localStorage.getItem(NOTES_TABS_STORAGE_KEY);
  if (!raw) {
    return {
      openTabIds: [],
      activeTabId: null,
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<{
      openTabIds: EntityId[];
      activeTabId: EntityId | null;
    }>;

    return {
      openTabIds: Array.isArray(parsed.openTabIds) ? parsed.openTabIds : [],
      activeTabId:
        typeof parsed.activeTabId === "string" ? parsed.activeTabId : null,
    };
  } catch {
    return {
      openTabIds: [],
      activeTabId: null,
    };
  }
}

const initialState = loadInitialNotesTabsState();

export const useNotesTabsStore = create<NotesTabsStoreState>((set) => ({
  openTabIds: initialState.openTabIds,
  activeTabId: initialState.activeTabId,
  openNoteTab: ({ id, activate = true }) => {
    set((state) => {
      const openTabIds = state.openTabIds.includes(id)
        ? state.openTabIds
        : [...state.openTabIds, id];

      return {
        openTabIds,
        activeTabId: activate ? id : state.activeTabId,
      };
    });
  },
  setActiveTab: (id) => {
    set((state) => {
      if (id === null) {
        return {
          ...state,
          activeTabId: null,
        };
      }

      const openTabIds = state.openTabIds.includes(id)
        ? state.openTabIds
        : [...state.openTabIds, id];

      return {
        openTabIds,
        activeTabId: id,
      };
    });
  },
  replaceActiveTab: (nextId) => {
    set((state) => {
      const currentActiveId = state.activeTabId;

      if (!currentActiveId) {
        return {
          openTabIds: [nextId],
          activeTabId: nextId,
        };
      }

      if (currentActiveId === nextId) {
        return {
          ...state,
          activeTabId: nextId,
        };
      }

      const activeIndex = state.openTabIds.findIndex(
        (tabId) => tabId === currentActiveId,
      );

      const remainingTabs = state.openTabIds.filter(
        (tabId) => tabId !== currentActiveId && tabId !== nextId,
      );

      const insertIndex =
        activeIndex >= 0 ? Math.min(activeIndex, remainingTabs.length) : 0;
      remainingTabs.splice(insertIndex, 0, nextId);

      return {
        openTabIds: remainingTabs,
        activeTabId: nextId,
      };
    });
  },
  closeNoteTab: (id) => {
    set((state) => {
      const closingIndex = state.openTabIds.findIndex((tabId) => tabId === id);

      if (closingIndex === -1) {
        return state;
      }

      const openTabIds = state.openTabIds.filter((tabId) => tabId !== id);

      if (state.activeTabId !== id) {
        return {
          ...state,
          openTabIds,
        };
      }

      const nextIndex = Math.max(0, closingIndex - 1);

      return {
        openTabIds,
        activeTabId: openTabIds[nextIndex] ?? null,
      };
    });
  },
  setOpenTabs: (ids) => {
    set((state) => {
      const openTabIds = Array.from(new Set(ids));

      if (state.activeTabId && openTabIds.includes(state.activeTabId)) {
        return {
          ...state,
          openTabIds,
        };
      }

      return {
        openTabIds,
        activeTabId: openTabIds[0] ?? null,
      };
    });
  },
  clearTabs: () => {
    set({
      openTabIds: [],
      activeTabId: null,
    });
  },
}));

if (typeof window !== "undefined") {
  useNotesTabsStore.subscribe((state) => {
    window.localStorage.setItem(
      NOTES_TABS_STORAGE_KEY,
      JSON.stringify({
        openTabIds: state.openTabIds,
        activeTabId: state.activeTabId,
      }),
    );
  });
}
