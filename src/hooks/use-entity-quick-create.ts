import { createEmptyNoteInput, DEFAULT_NOTE_TITLE } from "@/lib/note-defaults";
import { createEmptyProjectInput } from "@/lib/project-defaults";
import { createEmptyTaskInput } from "@/lib/task-defaults";
import { dataThunks, useAppDispatch } from "@/store";
import { useCallback } from "react";

export function useEntityQuickCreate() {
  const dispatch = useAppDispatch();

  const createQuickProject = useCallback(
    async (label: string) => {
      const created = await dispatch(
        dataThunks.projects.createOne(
          createEmptyProjectInput({
            name: label.trim() || "New project",
            paraType: "project",
          }),
        ),
      ).unwrap();

      return created.id;
    },
    [dispatch],
  );

  const createQuickNote = useCallback(
    async (label: string) => {
      const title = label.trim() || DEFAULT_NOTE_TITLE;
      const created = await dispatch(
        dataThunks.notes.createOne({
          ...createEmptyNoteInput(),
          title,
          body: `<h1>${title}</h1><p></p>`,
        }),
      ).unwrap();

      return created.id;
    },
    [dispatch],
  );

  const createQuickTask = useCallback(
    async (label: string) => {
      const created = await dispatch(
        dataThunks.tasks.createOne(
          createEmptyTaskInput({
            title: label.trim() || "New task",
            status: "inbox",
          }),
        ),
      ).unwrap();

      return created.id;
    },
    [dispatch],
  );

  const createQuickMeeting = useCallback(
    async (label: string) => {
      const created = await dispatch(
        dataThunks.meetings.createOne({
          title: label.trim() || "New meeting",
          tags: [],
          scheduledFor: new Date().toISOString(),
          location: "",
          personIds: [],
          companyIds: [],
          projectIds: [],
          noteIds: [],
          taskIds: [],
        }),
      ).unwrap();

      return created.id;
    },
    [dispatch],
  );

  const createQuickCompany = useCallback(
    async (label: string) => {
      const created = await dispatch(
        dataThunks.companies.createOne({
          name: label.trim() || "New company",
          tags: [],
          email: "",
          phone: "",
          address: "",
          website: "",
          personIds: [],
          projectIds: [],
          noteIds: [],
          taskIds: [],
          meetingIds: [],
        }),
      ).unwrap();

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

      const created = await dispatch(
        dataThunks.people.createOne({
          firstName,
          lastName,
          tags: [],
          email: "",
          phone: "",
          address: "",
          companyIds: [],
          projectIds: [],
          noteIds: [],
          taskIds: [],
          meetingIds: [],
        }),
      ).unwrap();

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
