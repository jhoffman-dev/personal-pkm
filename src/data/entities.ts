import type { BaseEntity, EntityId, IsoDateString } from "@/data/types";

export interface Project extends BaseEntity {
  name: string;
  paraType: ParaType;
  description?: string;
  tags: string[];
  personIds: EntityId[];
  companyIds: EntityId[];
  noteIds: EntityId[];
  taskIds: EntityId[];
  meetingIds: EntityId[];
}

export type ParaType = "project" | "area" | "resource" | "archive";

export interface Note extends BaseEntity {
  title: string;
  body: string;
  tags: string[];
  relatedNoteIds: EntityId[];
  personIds: EntityId[];
  companyIds: EntityId[];
  projectIds: EntityId[];
  taskIds: EntityId[];
  meetingIds: EntityId[];
}

export type TaskStatus =
  | "inbox"
  | "next_action"
  | "in_progress"
  | "waiting"
  | "someday"
  | "longterm"
  | "complete"
  | "archive";

export type TaskLevel = "story" | "task" | "subtask";

export interface Task extends BaseEntity {
  title: string;
  description?: string;
  notes?: string;
  tags: string[];
  status: TaskStatus;
  level: TaskLevel;
  parentTaskId?: EntityId | null;
  dueDate?: IsoDateString;
  personIds: EntityId[];
  companyIds: EntityId[];
  projectIds: EntityId[];
  noteIds: EntityId[];
  meetingIds: EntityId[];
}

export interface Meeting extends BaseEntity {
  title: string;
  tags: string[];
  scheduledFor: IsoDateString;
  location?: string;
  personIds: EntityId[];
  companyIds: EntityId[];
  projectIds: EntityId[];
  noteIds: EntityId[];
  taskIds: EntityId[];
}

export interface Company extends BaseEntity {
  name: string;
  tags: string[];
  website?: string;
  personIds: EntityId[];
  projectIds: EntityId[];
  noteIds: EntityId[];
  taskIds: EntityId[];
  meetingIds: EntityId[];
}

export interface Person extends BaseEntity {
  firstName: string;
  lastName: string;
  tags: string[];
  email?: string;
  companyIds: EntityId[];
  projectIds: EntityId[];
  noteIds: EntityId[];
  taskIds: EntityId[];
  meetingIds: EntityId[];
}

export type CreateProjectInput = Omit<
  Project,
  "id" | "createdAt" | "updatedAt"
>;
export type CreateNoteInput = Omit<Note, "id" | "createdAt" | "updatedAt">;
export type CreateTaskInput = Omit<Task, "id" | "createdAt" | "updatedAt">;
export type CreateMeetingInput = Omit<
  Meeting,
  "id" | "createdAt" | "updatedAt"
>;
export type CreateCompanyInput = Omit<
  Company,
  "id" | "createdAt" | "updatedAt"
>;
export type CreatePersonInput = Omit<Person, "id" | "createdAt" | "updatedAt">;

export type UpdateProjectInput = Partial<CreateProjectInput>;
export type UpdateNoteInput = Partial<CreateNoteInput>;
export type UpdateTaskInput = Partial<CreateTaskInput>;
export type UpdateMeetingInput = Partial<CreateMeetingInput>;
export type UpdateCompanyInput = Partial<CreateCompanyInput>;
export type UpdatePersonInput = Partial<CreatePersonInput>;
