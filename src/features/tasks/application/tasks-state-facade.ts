import type { EntityId } from "@/data/types";
import { useTasksViewStore } from "@/features/tasks/state";

export function useTasksViewFacade() {
  const selectedProjectId = useTasksViewStore(
    (state) => state.selectedProjectId,
  );
  const expandedTaskId = useTasksViewStore((state) => state.expandedTaskId);
  const setSelectedProjectId = useTasksViewStore(
    (state) => state.setSelectedProjectId,
  );
  const setExpandedTaskId = useTasksViewStore(
    (state) => state.setExpandedTaskId,
  );

  return {
    selectedProjectId,
    expandedTaskId,
    setSelectedProjectId,
    setExpandedTaskId,
  };
}

export const tasksViewFacade = {
  setSelectedProjectId(id: EntityId | null) {
    useTasksViewStore.getState().setSelectedProjectId(id);
  },
  setExpandedTaskId(id: EntityId | null) {
    useTasksViewStore.getState().setExpandedTaskId(id);
  },
};
