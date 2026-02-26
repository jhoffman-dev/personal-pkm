import type { Task, TaskLevel } from "@/data/entities";
import { normalizeTaskStatus } from "@/lib/task-defaults";

export type TaskNode = Task & { children: TaskNode[] };

export function clampTaskChildLevel(parentLevel: TaskLevel): TaskLevel {
  if (parentLevel === "story") {
    return "task";
  }

  return "subtask";
}

export function getTaskProgress(node: TaskNode): number {
  const descendants: TaskNode[] = [];

  const walk = (current: TaskNode) => {
    current.children.forEach((child) => {
      descendants.push(child);
      walk(child);
    });
  };

  walk(node);

  if (descendants.length === 0) {
    return normalizeTaskStatus(node.status) === "complete" ? 100 : 0;
  }

  const completed = descendants.filter(
    (task) => normalizeTaskStatus(task.status) === "complete",
  ).length;

  return Math.round((completed / descendants.length) * 100);
}

export function buildTaskTree(tasks: Task[]): TaskNode[] {
  const byId = new Map<string, TaskNode>();

  tasks.forEach((task) => {
    byId.set(task.id, {
      ...task,
      status: normalizeTaskStatus(task.status),
      level: task.level ?? "task",
      parentTaskId: task.parentTaskId ?? null,
      notes: task.notes ?? "",
      children: [],
    });
  });

  const roots: TaskNode[] = [];

  byId.forEach((node) => {
    const parentId = node.parentTaskId;
    if (!parentId || !byId.has(parentId)) {
      roots.push(node);
      return;
    }

    byId.get(parentId)?.children.push(node);
  });

  const sortRecursive = (items: TaskNode[]) => {
    items.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    items.forEach((item) => sortRecursive(item.children));
  };

  sortRecursive(roots);
  return roots;
}
