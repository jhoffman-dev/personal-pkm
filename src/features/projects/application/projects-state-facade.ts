import { useProjectsStore } from "@/features/projects/state";
import { useMemo } from "react";

export function useProjectsStateFacade() {
  const runtimeProjectsState = useProjectsStore((state) => state.projectsState);
  const selectedProjectId = useProjectsStore(
    (state) => state.selectedProjectId,
  );
  const setSelectedProjectIdInStore = useProjectsStore(
    (state) => state.setSelectedProjectId,
  );

  const projectsState = useMemo(
    () => ({
      ...runtimeProjectsState,
      selectedId: selectedProjectId,
    }),
    [runtimeProjectsState, selectedProjectId],
  );

  const setSelectedProjectId = (projectId: string | null) => {
    setSelectedProjectIdInStore(projectId);
  };

  return {
    projectsState,
    setSelectedProjectId,
  };
}

export const projectsStateFacade = {
  setSelectedProjectId(projectId: string | null) {
    useProjectsStore.getState().setSelectedProjectId(projectId);
  },
};
