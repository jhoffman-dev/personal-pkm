import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { EntityId } from "@/data/types";

export interface NotesTabsState {
  openTabIds: EntityId[];
  activeTabId: EntityId | null;
}

const initialState: NotesTabsState = {
  openTabIds: [],
  activeTabId: null,
};

export const notesTabsSlice = createSlice({
  name: "notesTabs",
  initialState,
  reducers: {
    openNoteTab(
      state,
      action: PayloadAction<{ id: EntityId; activate?: boolean }>,
    ) {
      const { id, activate = true } = action.payload;
      if (!state.openTabIds.includes(id)) {
        state.openTabIds.push(id);
      }
      if (activate) {
        state.activeTabId = id;
      }
    },
    setActiveTab(state, action: PayloadAction<EntityId | null>) {
      const id = action.payload;
      if (id === null) {
        state.activeTabId = null;
        return;
      }

      if (!state.openTabIds.includes(id)) {
        state.openTabIds.push(id);
      }
      state.activeTabId = id;
    },
    closeNoteTab(state, action: PayloadAction<EntityId>) {
      const id = action.payload;
      const closingIndex = state.openTabIds.findIndex((tabId) => tabId === id);

      if (closingIndex === -1) {
        return;
      }

      state.openTabIds.splice(closingIndex, 1);

      if (state.activeTabId !== id) {
        return;
      }

      const nextIndex = Math.max(0, closingIndex - 1);
      state.activeTabId = state.openTabIds[nextIndex] ?? null;
    },
    setOpenTabs(state, action: PayloadAction<EntityId[]>) {
      const nextIds = Array.from(new Set(action.payload));
      state.openTabIds = nextIds;

      if (state.activeTabId && nextIds.includes(state.activeTabId)) {
        return;
      }

      state.activeTabId = nextIds[0] ?? null;
    },
    clearTabs(state) {
      state.openTabIds = [];
      state.activeTabId = null;
    },
  },
});

export const notesTabsActions = notesTabsSlice.actions;
export const notesTabsReducer = notesTabsSlice.reducer;
