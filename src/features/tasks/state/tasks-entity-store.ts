import type { Task } from "@/data/entities";
import type { EntityId } from "@/data/types";
import {
  createInitialEntityRuntimeState,
  type EntityRuntimeState,
} from "@/features/shared/application/entity-runtime-state";
import { create } from "zustand";

export interface TasksEntityStoreState {
  selectedTaskId: EntityId | null;
  tasksState: EntityRuntimeState<Task>;
  setSelectedTaskId: (id: EntityId | null) => void;
}

export const useTasksEntityStore = create<TasksEntityStoreState>((set) => ({
  selectedTaskId: null,
  tasksState: createInitialEntityRuntimeState<Task>(),
  setSelectedTaskId: (id) => {
    set({ selectedTaskId: id });
  },
}));
