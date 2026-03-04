import { createEmptyNoteInput, DEFAULT_NOTE_TITLE } from "@/lib/note-defaults";
import { createEmptyProjectInput } from "@/lib/project-defaults";
import { createEmptyTaskInput } from "@/lib/task-defaults";
import { companiesDataRuntime } from "@/features/companies";
import { meetingsDataRuntime } from "@/features/meetings";
import { notesDataRuntime } from "@/features/notes";
import { peopleDataRuntime } from "@/features/people";
import { projectsDataRuntime } from "@/features/projects";
import { tasksDataRuntime } from "@/features/tasks";
import { useAppDispatch } from "@/store";
import { useCallback } from "react";

export function useEntityQuickCreate() {
  const dispatch = useAppDispatch();

  const createQuickProject = useCallback(
    async (label: string) => {
      const created = await projectsDataRuntime.createOne(
        dispatch,
        createEmptyProjectInput({
          name: label.trim() || "New project",
          paraType: "project",
        }),
      );

      return created.id;
    },
    [dispatch],
  );

  const createQuickNote = useCallback(
    async (label: string) => {
      const title = label.trim() || DEFAULT_NOTE_TITLE;
      const created = await notesDataRuntime.createOne(dispatch, {
        ...createEmptyNoteInput(),
        title,
        body: `<h1>${title}</h1><p></p>`,
      });

      return created.id;
    },
    [dispatch],
  );

  const createQuickTask = useCallback(
    async (label: string) => {
      const created = await tasksDataRuntime.createOne(
        dispatch,
        createEmptyTaskInput({
          title: label.trim() || "New task",
          status: "inbox",
        }),
      );

      return created.id;
    },
    [dispatch],
  );

  const createQuickMeeting = useCallback(
    async (label: string) => {
      const created = await meetingsDataRuntime.createOne(dispatch, {
        title: label.trim() || "New meeting",
        tags: [],
        scheduledFor: new Date().toISOString(),
        location: "",
        personIds: [],
        companyIds: [],
        projectIds: [],
        noteIds: [],
        taskIds: [],
      });

      return created.id;
    },
    [dispatch],
  );

  const createQuickCompany = useCallback(
    async (label: string) => {
      const created = await companiesDataRuntime.createOne(dispatch, {
        name: label.trim() || "New company",
        tags: [],
        photoUrl: "",
        email: "",
        phone: "",
        address: "",
        website: "",
        personIds: [],
        projectIds: [],
        noteIds: [],
        taskIds: [],
        meetingIds: [],
      });

      return created.id;
    },
    [dispatch],
  );

  const createQuickPerson = useCallback(
    async (label: string) => {
      const normalized = label.trim();
      const parts = normalized.split(/\s+/).filter(Boolean);
      const firstName = parts[0] || "New";
      const lastName = parts.slice(1).join(" ") || "Person";

      const created = await peopleDataRuntime.createOne(dispatch, {
        firstName,
        lastName,
        tags: [],
        photoUrl: "",
        email: "",
        phone: "",
        address: "",
        companyIds: [],
        projectIds: [],
        noteIds: [],
        taskIds: [],
        meetingIds: [],
      });

      return created.id;
    },
    [dispatch],
  );

  return {
    createQuickProject,
    createQuickNote,
    createQuickTask,
    createQuickMeeting,
    createQuickCompany,
    createQuickPerson,
  };
}
