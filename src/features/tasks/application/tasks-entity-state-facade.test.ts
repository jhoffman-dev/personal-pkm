import { tasksEntityStateFacade, useTasksEntityStore } from "@/features/tasks";
import { beforeEach, describe, expect, it } from "vitest";

describe("tasks entity state facade", () => {
  beforeEach(() => {
    tasksEntityStateFacade.setSelectedTaskId(null);
  });

  it("sets selected task id through facade command", () => {
    tasksEntityStateFacade.setSelectedTaskId("task-1");

    expect(useTasksEntityStore.getState().selectedTaskId).toBe("task-1");
  });
});
