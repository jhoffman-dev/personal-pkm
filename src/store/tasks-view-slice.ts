import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { EntityId } from "@/data/types";

export interface TasksViewState {
  selectedProjectId: EntityId | null;
  expandedTaskId: EntityId | null;
}

const initialState: TasksViewState = {
  selectedProjectId: null,
  expandedTaskId: null,
};

export const tasksViewSlice = createSlice({
  name: "tasksView",
  initialState,
  reducers: {
    setSelectedProjectId(state, action: PayloadAction<EntityId | null>) {
      state.selectedProjectId = action.payload;
    },
    setExpandedTaskId(state, action: PayloadAction<EntityId | null>) {
      state.expandedTaskId = action.payload;
    },
  },
});

export const tasksViewActions = tasksViewSlice.actions;
export const tasksViewReducer = tasksViewSlice.reducer;
