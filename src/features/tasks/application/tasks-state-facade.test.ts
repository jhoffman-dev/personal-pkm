import { tasksViewFacade } from "@/features/tasks";
import { useTasksViewStore } from "@/features/tasks/state";
import { beforeEach, describe, expect, it } from "vitest";

describe("tasks state facade", () => {
  beforeEach(() => {
    useTasksViewStore.setState({
      selectedProjectId: null,
      expandedTaskId: null,
    });
  });

  it("updates selected project id", () => {
    tasksViewFacade.setSelectedProjectId("p1");

    expect(useTasksViewStore.getState().selectedProjectId).toBe("p1");
  });

  it("updates expanded task id", () => {
    tasksViewFacade.setExpandedTaskId("t1");

    expect(useTasksViewStore.getState().expandedTaskId).toBe("t1");
  });
});
