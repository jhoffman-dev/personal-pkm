import type { Task, TaskLevel, TaskStatus } from "@/data/entities";

const TASK_STATES = [
  "inbox",
  "next_action",
  "in_progress",
  "waiting",
  "someday",
  "longterm",
  "complete",
  "archive",
] as const;

function normalizeTaskStatus(value: string | undefined): TaskStatus {
  if (!value) {
    return "inbox";
  }

  if (TASK_STATES.includes(value as (typeof TASK_STATES)[number])) {
    return value as TaskStatus;
  }

  if (value === "todo") {
    return "inbox";
  }

  if (value === "done") {
    return "complete";
  }

  return "inbox";
}

export type TaskNode = Task & { children: TaskNode[] };

/**
 * Resolves child level constraint from a parent task level.
 *
 * Rule:
 * - Stories can have `task` children; all other levels produce `subtask`.
 */
export function clampTaskChildLevel(parentLevel: TaskLevel): TaskLevel {
  if (parentLevel === "story") {
    return "task";
  }

  return "subtask";
}

/**
 * Computes completion progress based on descendant completion ratio.
 *
 * Edge case:
 * - Leaf nodes resolve to 100 when complete, otherwise 0.
 */
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

/**
 * Builds a parent/child task forest with normalized task fields.
 *
 * Invariants:
 * - Missing/invalid parent references are treated as root nodes.
 * - Output is sorted by `updatedAt` descending at each tree level.
 */
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
