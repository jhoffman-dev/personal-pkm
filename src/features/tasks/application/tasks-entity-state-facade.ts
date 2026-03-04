import { useTasksEntityStore } from "@/features/tasks/state";
import { useMemo } from "react";

export function useTasksEntityStateFacade() {
  const runtimeTasksState = useTasksEntityStore((state) => state.tasksState);
  const selectedTaskId = useTasksEntityStore((state) => state.selectedTaskId);
  const setSelectedTaskIdInStore = useTasksEntityStore(
    (state) => state.setSelectedTaskId,
  );

  const tasksState = useMemo(
    () => ({
      ...runtimeTasksState,
      selectedId: selectedTaskId,
    }),
    [runtimeTasksState, selectedTaskId],
  );

  const setSelectedTaskId = (taskId: string | null) => {
    setSelectedTaskIdInStore(taskId);
  };

  return {
    tasksState,
    setSelectedTaskId,
  };
}

export const tasksEntityStateFacade = {
  setSelectedTaskId(taskId: string | null) {
    useTasksEntityStore.getState().setSelectedTaskId(taskId);
  },
};
