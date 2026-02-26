import type { Project, Task } from "@/data/entities";
import { buildBacklogTaskGroups } from "@/features/calendar";
import type { TaskTimeblockMap } from "@/features/task-timeblocking";
import { describe, expect, it } from "vitest";

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? "task-1",
    createdAt: overrides.createdAt ?? "2026-02-20T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-02-20T00:00:00.000Z",
    title: overrides.title ?? "Task",
    description: overrides.description,
    notes: overrides.notes,
    tags: overrides.tags ?? [],
    status: overrides.status ?? "next_action",
    level: overrides.level ?? "task",
    parentTaskId: overrides.parentTaskId ?? null,
    dueDate: overrides.dueDate,
    personIds: overrides.personIds ?? [],
    companyIds: overrides.companyIds ?? [],
    projectIds: overrides.projectIds ?? [],
    noteIds: overrides.noteIds ?? [],
    meetingIds: overrides.meetingIds ?? [],
  };
}

function makeProject(overrides: Partial<Project>): Project {
  return {
    id: overrides.id ?? "project-1",
    createdAt: overrides.createdAt ?? "2026-02-20T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-02-20T00:00:00.000Z",
    name: overrides.name ?? "Project",
    paraType: overrides.paraType ?? "project",
    description: overrides.description,
    tags: overrides.tags ?? [],
    personIds: overrides.personIds ?? [],
    companyIds: overrides.companyIds ?? [],
    noteIds: overrides.noteIds ?? [],
    taskIds: overrides.taskIds ?? [],
    meetingIds: overrides.meetingIds ?? [],
  };
}

describe("buildBacklogTaskGroups", () => {
  it("groups eligible tasks by project and excludes already timeblocked tasks", () => {
    const tasks = [
      makeTask({ id: "t1", title: "Alpha", projectIds: ["p1"] }),
      makeTask({ id: "t2", title: "Beta", projectIds: ["p1"] }),
      makeTask({ id: "t3", title: "Gamma", status: "in_progress" }),
      makeTask({ id: "t4", title: "Done", status: "complete" }),
    ];

    const projects = [makeProject({ id: "p1", name: "Roadmap" })];
    const blocks: TaskTimeblockMap = {
      t2: {
        start: "2026-02-26T09:00:00.000Z",
        end: "2026-02-26T09:30:00.000Z",
      },
    };

    const groups = buildBacklogTaskGroups(tasks, projects, blocks);

    expect(groups).toHaveLength(2);
    expect(groups[0].projectName).toBe("No Project");
    expect(groups[0].tasks.map((task) => task.id)).toEqual(["t3"]);

    expect(groups[1].projectName).toBe("Roadmap");
    expect(groups[1].tasks.map((task) => task.id)).toEqual(["t1"]);
  });
});
