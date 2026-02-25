import type { CreateTaskInput, TaskLevel, TaskStatus } from "@/data/entities";
import type { EntityId } from "@/data/types";

export const TASK_STATES: TaskStatus[] = [
  "inbox",
  "next_action",
  "in_progress",
  "waiting",
  "someday",
  "longterm",
  "complete",
  "archive",
];

export const TASK_STATE_LABELS: Record<TaskStatus, string> = {
  inbox: "Inbox",
  next_action: "Next Action",
  in_progress: "In Progress",
  waiting: "Waiting",
  someday: "Someday",
  longterm: "Longterm",
  complete: "Complete",
  archive: "Archive",
};

export function normalizeTaskStatus(value: string | undefined): TaskStatus {
  if (!value) {
    return "inbox";
  }

  if (TASK_STATES.includes(value as TaskStatus)) {
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

export function createEmptyTaskInput(params?: {
  title?: string;
  level?: TaskLevel;
  parentTaskId?: EntityId | null;
  projectIds?: EntityId[];
  status?: TaskStatus;
}): CreateTaskInput {
  return {
    title: params?.title?.trim() || "Untitled task",
    description: "",
    notes: "",
    tags: [],
    status: params?.status ?? "inbox",
    level: params?.level ?? "task",
    parentTaskId: params?.parentTaskId ?? null,
    dueDate: undefined,
    personIds: [],
    companyIds: [],
    projectIds: params?.projectIds ?? [],
    noteIds: [],
    meetingIds: [],
  };
}
