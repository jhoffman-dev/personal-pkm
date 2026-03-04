import type { Project } from "@/data/entities";
import type { EntityId } from "@/data/types";
import {
  createInitialEntityRuntimeState,
  type EntityRuntimeState,
} from "@/features/shared/application/entity-runtime-state";
import { create } from "zustand";

export interface ProjectsStoreState {
  selectedProjectId: EntityId | null;
  projectsState: EntityRuntimeState<Project>;
  setSelectedProjectId: (id: EntityId | null) => void;
}

export const useProjectsStore = create<ProjectsStoreState>((set) => ({
  selectedProjectId: null,
  projectsState: createInitialEntityRuntimeState<Project>(),
  setSelectedProjectId: (id) => {
    set({ selectedProjectId: id });
  },
}));
