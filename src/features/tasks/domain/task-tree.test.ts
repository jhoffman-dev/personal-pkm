import type { Task } from "@/data/entities";
import {
  buildTaskTree,
  clampTaskChildLevel,
  getTaskProgress,
} from "@/features/tasks/domain/task-tree";
import { describe, expect, it } from "vitest";

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: "t0",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    title: "Task",
    tags: [],
    status: "inbox",
    level: "task",
    personIds: [],
    companyIds: [],
    projectIds: [],
    noteIds: [],
    meetingIds: [],
    ...overrides,
  };
}

describe("task-tree", () => {
  it("clamps child level from story->task and task->subtask", () => {
    expect(clampTaskChildLevel("story")).toBe("task");
    expect(clampTaskChildLevel("task")).toBe("subtask");
  });

  it("builds parent-child hierarchy sorted by updatedAt desc", () => {
    const tree = buildTaskTree([
      makeTask({
        id: "child-old",
        title: "Child old",
        parentTaskId: "root",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
      makeTask({
        id: "root",
        level: "story",
        title: "Root",
        updatedAt: "2026-02-01T00:00:00.000Z",
      }),
      makeTask({
        id: "child-new",
        title: "Child new",
        parentTaskId: "root",
        updatedAt: "2026-03-01T00:00:00.000Z",
      }),
    ]);

    expect(tree.length).toBe(1);
    expect(tree[0].id).toBe("root");
    expect(tree[0].children.map((item) => item.id)).toEqual([
      "child-new",
      "child-old",
    ]);
  });

  it("calculates progress from descendants completion", () => {
    const [root] = buildTaskTree([
      makeTask({ id: "root", level: "story" }),
      makeTask({ id: "a", parentTaskId: "root", status: "complete" }),
      makeTask({ id: "b", parentTaskId: "root", status: "in_progress" }),
      makeTask({ id: "c", parentTaskId: "a", status: "complete" }),
    ]);

    expect(getTaskProgress(root)).toBe(67);
  });
});
