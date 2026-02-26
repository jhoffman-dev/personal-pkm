import type { TaskStatus, UpdateTaskInput } from "@/data/entities";

export type TaskDetailsDraft = {
  title: string;
  description: string;
  tags: string[];
  status: TaskStatus;
  dueDate: string;
  noteIds: string[];
  projectIds: string[];
  personIds: string[];
  companyIds: string[];
  meetingIds: string[];
};

export function buildTaskDetailsUpdateInput(
  details: TaskDetailsDraft,
): UpdateTaskInput {
  return {
    title: details.title || "Untitled task",
    description: details.description,
    tags: details.tags,
    status: details.status,
    dueDate: details.dueDate
      ? new Date(details.dueDate).toISOString()
      : undefined,
    noteIds: details.noteIds,
    projectIds: details.projectIds,
    personIds: details.personIds,
    companyIds: details.companyIds,
    meetingIds: details.meetingIds,
  };
}
