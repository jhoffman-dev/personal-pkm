import { dataActions, dataThunks, type AppDispatch } from "@/store";
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
      void dispatch(dataThunks.notes.fetchAll());
    }
  }, [dispatch, isNotesRoute, notesStatus]);

  React.useEffect(() => {
    if (isNotesRoute && !notesSelectedId && sortedNotes.length > 0) {
      dispatch(dataActions.notes.setSelectedId(sortedNotes[0].id));
    }
  }, [dispatch, isNotesRoute, notesSelectedId, sortedNotes]);

  React.useEffect(() => {
    if (isTasksRoute && projectsStatus === "idle") {
      void dispatch(dataThunks.projects.fetchAll());
    }

    if (isTasksRoute && tasksStatus === "idle") {
      void dispatch(dataThunks.tasks.fetchAll());
    }
  }, [dispatch, isTasksRoute, projectsStatus, tasksStatus]);

  React.useEffect(() => {
    if (isMeetingsRoute && meetingsStatus === "idle") {
      void dispatch(dataThunks.meetings.fetchAll());
    }
  }, [dispatch, isMeetingsRoute, meetingsStatus]);

  React.useEffect(() => {
    if (isProjectsRoute && projectsStatus === "idle") {
      void dispatch(dataThunks.projects.fetchAll());
    }
  }, [dispatch, isProjectsRoute, projectsStatus]);

  React.useEffect(() => {
    if (isCompaniesRoute && companiesStatus === "idle") {
      void dispatch(dataThunks.companies.fetchAll());
    }
  }, [companiesStatus, dispatch, isCompaniesRoute]);

  React.useEffect(() => {
    if (isPeopleRoute && peopleStatus === "idle") {
      void dispatch(dataThunks.people.fetchAll());
    }
  }, [dispatch, isPeopleRoute, peopleStatus]);
}
