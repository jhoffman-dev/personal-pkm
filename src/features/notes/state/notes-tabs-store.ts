import type { EntityId } from "@/data/types";
import { create } from "zustand";

const NOTES_TABS_STORAGE_KEY = "pkm.notes.tabs.v1";
export const DEFAULT_NOTES_TAB_SCOPE_ID = "primary";

export interface NotesTabScopeState {
  openTabIds: EntityId[];
  activeTabId: EntityId | null;
}

const EMPTY_SCOPE_STATE: NotesTabScopeState = {
  openTabIds: [],
  activeTabId: null,
};

function normalizeScopeId(
  scopeId: string | undefined,
  fallback: string,
): string {
  if (typeof scopeId !== "string") {
    return fallback;
  }

  const trimmedScopeId = scopeId.trim();
  return trimmedScopeId.length > 0 ? trimmedScopeId : fallback;
}

function normalizeEntityIdList(value: unknown): EntityId[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value.filter((entry): entry is EntityId => typeof entry === "string"),
    ),
  );
}

function normalizeScopeState(value: unknown): NotesTabScopeState {
  if (typeof value !== "object" || value === null) {
    return EMPTY_SCOPE_STATE;
  }

  const parsed = value as Partial<NotesTabScopeState>;
  const openTabIds = normalizeEntityIdList(parsed.openTabIds);
  const activeTabId =
    typeof parsed.activeTabId === "string"
      ? parsed.activeTabId
      : EMPTY_SCOPE_STATE.activeTabId;

  if (openTabIds.length === 0 && activeTabId === null) {
    return EMPTY_SCOPE_STATE;
  }

  return {
    openTabIds,
    activeTabId,
  };
}

function getScopeStateFromMap(
  scopeStates: Record<string, NotesTabScopeState>,
  scopeId: string,
): NotesTabScopeState {
  return scopeStates[scopeId] ?? EMPTY_SCOPE_STATE;
}

function ensureScopeState(
  scopeStates: Record<string, NotesTabScopeState>,
  scopeId: string,
): NotesTabScopeState {
  return (
    scopeStates[scopeId] ?? {
      openTabIds: [],
      activeTabId: null,
    }
  );
}

function updateScopeState(
  state: NotesTabsStoreState,
  scopeId: string,
  updater: (scopeState: NotesTabScopeState) => NotesTabScopeState,
): NotesTabsStoreState {
  const currentScopeState = ensureScopeState(state.scopeStates, scopeId);
  const nextScopeState = updater(currentScopeState);

  if (
    nextScopeState.openTabIds === currentScopeState.openTabIds &&
    nextScopeState.activeTabId === currentScopeState.activeTabId
  ) {
    return state;
  }

  const scopeStates = {
    ...state.scopeStates,
    [scopeId]: nextScopeState,
  };

  if (scopeId !== state.activeScopeId) {
    return {
      ...state,
      scopeStates,
    };
  }

  return {
    ...state,
    scopeStates,
    openTabIds: nextScopeState.openTabIds,
    activeTabId: nextScopeState.activeTabId,
  };
}

export interface NotesTabsStoreState {
  activeScopeId: string;
  scopeStates: Record<string, NotesTabScopeState>;
  openTabIds: EntityId[];
  activeTabId: EntityId | null;
  setActiveScope: (scopeId: string) => void;
  openNoteTab: (
    params: { id: EntityId; activate?: boolean },
    scopeId?: string,
  ) => void;
  setActiveTab: (id: EntityId | null, scopeId?: string) => void;
  replaceActiveTab: (nextId: EntityId, scopeId?: string) => void;
  closeNoteTab: (id: EntityId, scopeId?: string) => void;
  setOpenTabs: (ids: EntityId[], scopeId?: string) => void;
  clearTabs: (scopeId?: string) => void;
}

function loadInitialNotesTabsState(): Pick<
  NotesTabsStoreState,
  "activeScopeId" | "scopeStates" | "openTabIds" | "activeTabId"
> {
  if (typeof window === "undefined") {
    return {
      activeScopeId: DEFAULT_NOTES_TAB_SCOPE_ID,
      scopeStates: {
        [DEFAULT_NOTES_TAB_SCOPE_ID]: {
          openTabIds: [],
          activeTabId: null,
        },
      },
      openTabIds: [],
      activeTabId: null,
    };
  }

  const raw = window.localStorage.getItem(NOTES_TABS_STORAGE_KEY);
  if (!raw) {
    return {
      activeScopeId: DEFAULT_NOTES_TAB_SCOPE_ID,
      scopeStates: {
        [DEFAULT_NOTES_TAB_SCOPE_ID]: {
          openTabIds: [],
          activeTabId: null,
        },
      },
      openTabIds: [],
      activeTabId: null,
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<{
      activeScopeId: string;
      scopeStates: Record<string, unknown>;
      openTabIds: EntityId[];
      activeTabId: EntityId | null;
    }>;

    const activeScopeId = normalizeScopeId(
      parsed.activeScopeId,
      DEFAULT_NOTES_TAB_SCOPE_ID,
    );

    let scopeStates: Record<string, NotesTabScopeState> = {};

    if (typeof parsed.scopeStates === "object" && parsed.scopeStates !== null) {
      scopeStates = Object.entries(parsed.scopeStates).reduce<
        Record<string, NotesTabScopeState>
      >((nextScopeStates, [scopeId, scopeStateValue]) => {
        const normalizedScopeState = normalizeScopeState(scopeStateValue);
        if (normalizedScopeState === EMPTY_SCOPE_STATE) {
          return nextScopeStates;
        }

        nextScopeStates[scopeId] = normalizedScopeState;
        return nextScopeStates;
      }, {});
    }

    if (Object.keys(scopeStates).length === 0) {
      const openTabIds = normalizeEntityIdList(parsed.openTabIds);
      const activeTabId =
        typeof parsed.activeTabId === "string" ? parsed.activeTabId : null;

      scopeStates = {
        [DEFAULT_NOTES_TAB_SCOPE_ID]: {
          openTabIds,
          activeTabId,
        },
      };
    }

    if (!scopeStates[activeScopeId]) {
      scopeStates[activeScopeId] = {
        openTabIds: [],
        activeTabId: null,
      };
    }

    const activeScopeState = getScopeStateFromMap(scopeStates, activeScopeId);

    return {
      activeScopeId,
      scopeStates,
      openTabIds: activeScopeState.openTabIds,
      activeTabId: activeScopeState.activeTabId,
    };
  } catch {
    return {
      activeScopeId: DEFAULT_NOTES_TAB_SCOPE_ID,
      scopeStates: {
        [DEFAULT_NOTES_TAB_SCOPE_ID]: {
          openTabIds: [],
          activeTabId: null,
        },
      },
      openTabIds: [],
      activeTabId: null,
    };
  }
}

const initialState = loadInitialNotesTabsState();

export function selectNotesTabScopeState(
  state: NotesTabsStoreState,
  scopeId: string,
): NotesTabScopeState {
  return getScopeStateFromMap(state.scopeStates, scopeId);
}

export const useNotesTabsStore = create<NotesTabsStoreState>((set) => ({
  activeScopeId: initialState.activeScopeId,
  scopeStates: initialState.scopeStates,
  openTabIds: initialState.openTabIds,
  activeTabId: initialState.activeTabId,
  setActiveScope: (scopeId) => {
    set((state) => {
      const nextScopeId = normalizeScopeId(scopeId, state.activeScopeId);
      if (nextScopeId === state.activeScopeId) {
        return state;
      }

      const nextScopeState = ensureScopeState(state.scopeStates, nextScopeId);

      return {
        ...state,
        activeScopeId: nextScopeId,
        scopeStates: {
          ...state.scopeStates,
          [nextScopeId]: nextScopeState,
        },
        openTabIds: nextScopeState.openTabIds,
        activeTabId: nextScopeState.activeTabId,
      };
    });
  },
  openNoteTab: ({ id, activate = true }, scopeId) => {
    set((state) => {
      const targetScopeId = normalizeScopeId(scopeId, state.activeScopeId);

      return updateScopeState(state, targetScopeId, (scopeState) => {
        const openTabIds = scopeState.openTabIds.includes(id)
          ? scopeState.openTabIds
          : [...scopeState.openTabIds, id];

        const activeTabId = activate ? id : scopeState.activeTabId;
        if (
          openTabIds === scopeState.openTabIds &&
          activeTabId === scopeState.activeTabId
        ) {
          return scopeState;
        }

        return {
          openTabIds,
          activeTabId,
        };
      });
    });
  },
  setActiveTab: (id, scopeId) => {
    set((state) => {
      const targetScopeId = normalizeScopeId(scopeId, state.activeScopeId);

      return updateScopeState(state, targetScopeId, (scopeState) => {
        if (id === null) {
          if (scopeState.activeTabId === null) {
            return scopeState;
          }

          return {
            ...scopeState,
            activeTabId: null,
          };
        }

        const openTabIds = scopeState.openTabIds.includes(id)
          ? scopeState.openTabIds
          : [...scopeState.openTabIds, id];

        if (
          openTabIds === scopeState.openTabIds &&
          scopeState.activeTabId === id
        ) {
          return scopeState;
        }

        return {
          openTabIds,
          activeTabId: id,
        };
      });
    });
  },
  replaceActiveTab: (nextId, scopeId) => {
    set((state) => {
      const targetScopeId = normalizeScopeId(scopeId, state.activeScopeId);

      return updateScopeState(state, targetScopeId, (scopeState) => {
        const currentActiveId = scopeState.activeTabId;

        if (!currentActiveId) {
          return {
            openTabIds: [nextId],
            activeTabId: nextId,
          };
        }

        if (currentActiveId === nextId) {
          return {
            ...scopeState,
            activeTabId: nextId,
          };
        }

        const activeIndex = scopeState.openTabIds.findIndex(
          (tabId) => tabId === currentActiveId,
        );

        const remainingTabs = scopeState.openTabIds.filter(
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
    });
  },
  closeNoteTab: (id, scopeId) => {
    set((state) => {
      const targetScopeId = normalizeScopeId(scopeId, state.activeScopeId);

      return updateScopeState(state, targetScopeId, (scopeState) => {
        const closingIndex = scopeState.openTabIds.findIndex(
          (tabId) => tabId === id,
        );

        if (closingIndex === -1) {
          return scopeState;
        }

        const openTabIds = scopeState.openTabIds.filter(
          (tabId) => tabId !== id,
        );

        if (scopeState.activeTabId !== id) {
          return {
            ...scopeState,
            openTabIds,
          };
        }

        const nextIndex = Math.max(0, closingIndex - 1);

        return {
          openTabIds,
          activeTabId: openTabIds[nextIndex] ?? null,
        };
      });
    });
  },
  setOpenTabs: (ids, scopeId) => {
    set((state) => {
      const targetScopeId = normalizeScopeId(scopeId, state.activeScopeId);

      return updateScopeState(state, targetScopeId, (scopeState) => {
        const openTabIds = Array.from(new Set(ids));

        if (
          scopeState.activeTabId &&
          openTabIds.includes(scopeState.activeTabId)
        ) {
          return {
            ...scopeState,
            openTabIds,
          };
        }

        return {
          openTabIds,
          activeTabId: openTabIds[0] ?? null,
        };
      });
    });
  },
  clearTabs: (scopeId) => {
    set((state) => {
      const targetScopeId = normalizeScopeId(scopeId, state.activeScopeId);

      return updateScopeState(state, targetScopeId, () => ({
        openTabIds: [],
        activeTabId: null,
      }));
    });
  },
}));

if (typeof window !== "undefined") {
  useNotesTabsStore.subscribe((state) => {
    window.localStorage.setItem(
      NOTES_TABS_STORAGE_KEY,
      JSON.stringify({
        activeScopeId: state.activeScopeId,
        scopeStates: state.scopeStates,
      }),
    );
  });
}
