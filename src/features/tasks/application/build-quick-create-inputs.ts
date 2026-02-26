import type {
  CreateCompanyInput,
  CreateMeetingInput,
  CreateNoteInput,
  CreatePersonInput,
  CreateProjectInput,
  CreateTaskInput,
  Task,
} from "@/data/entities";
import { createEmptyNoteInput, DEFAULT_NOTE_TITLE } from "@/lib/note-defaults";
import { createEmptyProjectInput } from "@/lib/project-defaults";
import { createEmptyTaskInput, normalizeTaskStatus } from "@/lib/task-defaults";
import { clampTaskChildLevel } from "@/features/tasks/domain/task-tree";

export function buildStoryCreateInput(params: {
  title: string;
  selectedProjectId?: string | null;
}): CreateTaskInput {
  const projectIds = params.selectedProjectId ? [params.selectedProjectId] : [];
  return createEmptyTaskInput({
    title: params.title.trim() || "New story",
    level: "story",
    projectIds,
  });
}

export function buildChildTaskCreateInput(parent: Task): CreateTaskInput {
  const nextLevel = clampTaskChildLevel(parent.level);

  return createEmptyTaskInput({
    title: `New ${nextLevel}`,
    level: nextLevel,
    parentTaskId: parent.id,
    projectIds: parent.projectIds ?? [],
    status: normalizeTaskStatus(parent.status),
  });
}

export function buildQuickNoteCreateInput(label: string): CreateNoteInput {
  const title = label.trim() || DEFAULT_NOTE_TITLE;
  return {
    ...createEmptyNoteInput(),
    title,
    body: `<h1>${title}</h1><p></p>`,
  };
}

export function buildQuickTaskCreateInput(label: string): CreateTaskInput {
  return createEmptyTaskInput({
    title: label.trim() || "New task",
    status: "inbox",
  });
}

export function buildQuickProjectCreateInput(
  label: string,
): CreateProjectInput {
  return createEmptyProjectInput({
    name: label.trim() || "New project",
    paraType: "project",
  });
}

export function buildQuickPersonCreateInput(label: string): CreatePersonInput {
  const normalized = label.trim();
  const parts = normalized.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "New";
  const lastName = parts.slice(1).join(" ") || "Person";

  return {
    firstName,
    lastName,
    tags: [],
    email: "",
    companyIds: [],
    projectIds: [],
    noteIds: [],
    taskIds: [],
    meetingIds: [],
  };
}

export function buildQuickCompanyCreateInput(
  label: string,
): CreateCompanyInput {
  return {
    name: label.trim() || "New company",
    tags: [],
    website: "",
    personIds: [],
    projectIds: [],
    noteIds: [],
    taskIds: [],
    meetingIds: [],
  };
}

export function buildQuickMeetingCreateInput(
  label: string,
  scheduledFor = new Date().toISOString(),
): CreateMeetingInput {
  return {
    title: label.trim() || "New meeting",
    tags: [],
    scheduledFor,
    location: "",
    personIds: [],
    companyIds: [],
    projectIds: [],
    noteIds: [],
    taskIds: [],
  };
}
