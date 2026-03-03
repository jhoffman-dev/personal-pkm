import type { ParaType } from "@/data/entities";
import { normalizeParaType } from "@/lib/project-defaults";
import type { RootState } from "@/store";
import * as React from "react";

export function useAppSidebarDerivedData(params: {
  notesState: RootState["notes"];
  projectsState: RootState["projects"];
  meetingsState: RootState["meetings"];
  companiesState: RootState["companies"];
  peopleState: RootState["people"];
  tasksState: RootState["tasks"];
}) {
  const {
    notesState,
    projectsState,
    meetingsState,
    companiesState,
    peopleState,
    tasksState,
  } = params;

  const sortedNotes = React.useMemo(
    () =>
      notesState.ids
        .map((id) => notesState.entities[id])
        .filter(Boolean)
        .sort((a, b) => {
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        }),
    [notesState.entities, notesState.ids],
  );

  const projectsWithTaskCount = React.useMemo(
    () =>
      projectsState.ids
        .map((id) => projectsState.entities[id])
        .filter(Boolean)
        .filter((project) => normalizeParaType(project.paraType) !== "archive")
        .map((project) => ({
          id: project.id,
          name: project.name,
          taskCount: tasksState.ids
            .map((taskId) => tasksState.entities[taskId])
            .filter(Boolean)
            .filter((task) => (task.projectIds ?? []).includes(project.id))
            .length,
        })),
    [
      projectsState.entities,
      projectsState.ids,
      tasksState.entities,
      tasksState.ids,
    ],
  );

  const allTaskCount = React.useMemo(
    () => tasksState.ids.length,
    [tasksState.ids.length],
  );

  const projectsByPara = React.useMemo(() => {
    const grouped: Record<ParaType, { id: string; name: string }[]> = {
      project: [],
      area: [],
      resource: [],
      archive: [],
    };

    projectsState.ids
      .map((id) => projectsState.entities[id])
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .forEach((project) => {
        grouped[normalizeParaType(project.paraType)].push({
          id: project.id,
          name: project.name,
        });
      });

    return grouped;
  }, [projectsState.entities, projectsState.ids]);

  const sortedCompanies = React.useMemo(
    () =>
      companiesState.ids
        .map((id) => companiesState.entities[id])
        .filter(Boolean)
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, {
            sensitivity: "base",
          }),
        ),
    [companiesState.entities, companiesState.ids],
  );

  const sortedPeople = React.useMemo(
    () =>
      peopleState.ids
        .map((id) => peopleState.entities[id])
        .filter(Boolean)
        .sort((a, b) => {
          const byLastName = (a.lastName ?? "").localeCompare(
            b.lastName ?? "",
            undefined,
            {
              sensitivity: "base",
            },
          );

          if (byLastName !== 0) {
            return byLastName;
          }

          return (a.firstName ?? "").localeCompare(
            b.firstName ?? "",
            undefined,
            {
              sensitivity: "base",
            },
          );
        }),
    [peopleState.entities, peopleState.ids],
  );

  const sortedMeetings = React.useMemo(
    () =>
      meetingsState.ids
        .map((id) => meetingsState.entities[id])
        .filter(Boolean)
        .sort((a, b) => {
          const byTitle = a.title.localeCompare(b.title, undefined, {
            sensitivity: "base",
          });

          if (byTitle !== 0) {
            return byTitle;
          }

          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        }),
    [meetingsState.entities, meetingsState.ids],
  );

  return {
    sortedNotes,
    projectsWithTaskCount,
    allTaskCount,
    projectsByPara,
    sortedCompanies,
    sortedPeople,
    sortedMeetings,
  };
}
