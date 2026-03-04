import type { EntityId } from "@/data/types";
import { create } from "zustand";

const TASKS_VIEW_STORAGE_KEY = "pkm.tasks.view.v1";

export interface TasksViewStoreState {
  selectedProjectId: EntityId | null;
  expandedTaskId: EntityId | null;
  setSelectedProjectId: (id: EntityId | null) => void;
  setExpandedTaskId: (id: EntityId | null) => void;
}

function loadInitialTasksViewState(): Pick<
  TasksViewStoreState,
  "selectedProjectId" | "expandedTaskId"
> {
  if (typeof window === "undefined") {
    return {
      selectedProjectId: null,
      expandedTaskId: null,
    };
  }

  const raw = window.localStorage.getItem(TASKS_VIEW_STORAGE_KEY);
  if (!raw) {
    return {
      selectedProjectId: null,
      expandedTaskId: null,
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<{
      selectedProjectId: EntityId | null;
      expandedTaskId: EntityId | null;
    }>;

    return {
      selectedProjectId:
        typeof parsed.selectedProjectId === "string"
          ? parsed.selectedProjectId
          : null,
      expandedTaskId:
        typeof parsed.expandedTaskId === "string"
          ? parsed.expandedTaskId
          : null,
    };
  } catch {
    return {
      selectedProjectId: null,
      expandedTaskId: null,
    };
  }
}

const initialState = loadInitialTasksViewState();

export const useTasksViewStore = create<TasksViewStoreState>((set) => ({
  selectedProjectId: initialState.selectedProjectId,
  expandedTaskId: initialState.expandedTaskId,
  setSelectedProjectId: (id) => {
    set({ selectedProjectId: id });
  },
  setExpandedTaskId: (id) => {
    set({ expandedTaskId: id });
  },
}));

if (typeof window !== "undefined") {
  useTasksViewStore.subscribe((state) => {
    window.localStorage.setItem(
      TASKS_VIEW_STORAGE_KEY,
      JSON.stringify({
        selectedProjectId: state.selectedProjectId,
        expandedTaskId: state.expandedTaskId,
      }),
    );
  });
}
