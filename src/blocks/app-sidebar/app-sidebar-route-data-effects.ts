import { companiesDataRuntime } from "@/features/companies";
import { meetingsDataRuntime } from "@/features/meetings";
import { notesDataRuntime, notesEntityStateFacade } from "@/features/notes";
import { peopleDataRuntime } from "@/features/people";
import { projectsDataRuntime } from "@/features/projects";
import { tasksDataRuntime } from "@/features/tasks";
import { type AppDispatch } from "@/store";
import * as React from "react";

export function useAppSidebarRouteDataEffects(params: {
  dispatch: AppDispatch;
  isNotesRoute: boolean;
  isTasksRoute: boolean;
  isMeetingsRoute: boolean;
  isProjectsRoute: boolean;
  isCompaniesRoute: boolean;
  isPeopleRoute: boolean;
  notesStatus: string;
  notesSelectedId: string | null;
  sortedNotes: Array<{ id: string }>;
  projectsStatus: string;
  tasksStatus: string;
  meetingsStatus: string;
  companiesStatus: string;
  peopleStatus: string;
}) {
  const {
    dispatch,
    isNotesRoute,
    isTasksRoute,
    isMeetingsRoute,
    isProjectsRoute,
    isCompaniesRoute,
    isPeopleRoute,
    notesStatus,
    notesSelectedId,
    sortedNotes,
    projectsStatus,
    tasksStatus,
    meetingsStatus,
    companiesStatus,
    peopleStatus,
  } = params;

  React.useEffect(() => {
    if (isNotesRoute && notesStatus === "idle") {
      void notesDataRuntime.fetchAll(dispatch);
    }
  }, [dispatch, isNotesRoute, notesStatus]);

  React.useEffect(() => {
    if (isNotesRoute && !notesSelectedId && sortedNotes.length > 0) {
      notesEntityStateFacade.setSelectedNoteId(sortedNotes[0].id);
    }
  }, [isNotesRoute, notesSelectedId, sortedNotes]);

  React.useEffect(() => {
    if (isTasksRoute && projectsStatus === "idle") {
      void projectsDataRuntime.fetchAll(dispatch);
    }

    if (isTasksRoute && tasksStatus === "idle") {
      void tasksDataRuntime.fetchAll(dispatch);
    }
  }, [dispatch, isTasksRoute, projectsStatus, tasksStatus]);

  React.useEffect(() => {
    if (isMeetingsRoute && meetingsStatus === "idle") {
      void meetingsDataRuntime.fetchAll(dispatch);
    }
  }, [dispatch, isMeetingsRoute, meetingsStatus]);

  React.useEffect(() => {
    if (isProjectsRoute && projectsStatus === "idle") {
      void projectsDataRuntime.fetchAll(dispatch);
    }
  }, [dispatch, isProjectsRoute, projectsStatus]);

  React.useEffect(() => {
    if (isCompaniesRoute && companiesStatus === "idle") {
      void companiesDataRuntime.fetchAll(dispatch);
    }
  }, [companiesStatus, dispatch, isCompaniesRoute]);

  React.useEffect(() => {
    if (isPeopleRoute && peopleStatus === "idle") {
      void peopleDataRuntime.fetchAll(dispatch);
    }
  }, [dispatch, isPeopleRoute, peopleStatus]);
}
