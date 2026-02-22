import { configureStore, createListenerMiddleware } from "@reduxjs/toolkit";

import { dataReducers, dataThunks } from "@/store/data-slices";
import {
  notesTabsActions,
  notesTabsReducer,
  type NotesTabsState,
} from "@/store/notes-tabs-slice";
import {
  tasksViewActions,
  tasksViewReducer,
  type TasksViewState,
} from "@/store/tasks-view-slice";

const NOTES_TABS_STORAGE_KEY = "pkm.notes.tabs.v1";
const TASKS_VIEW_STORAGE_KEY = "pkm.tasks.view.v1";

const mutationFulfilledPattern =
  /\/(createOne|updateOne|deleteOne)\/fulfilled$/;

const syncRelationsMiddleware = createListenerMiddleware();

syncRelationsMiddleware.startListening({
  predicate: (action) => mutationFulfilledPattern.test(action.type),
  effect: async (_, api) => {
    await Promise.all([
      api.dispatch(dataThunks.projects.fetchAll()),
      api.dispatch(dataThunks.notes.fetchAll()),
      api.dispatch(dataThunks.tasks.fetchAll()),
      api.dispatch(dataThunks.meetings.fetchAll()),
      api.dispatch(dataThunks.companies.fetchAll()),
      api.dispatch(dataThunks.people.fetchAll()),
    ]);
  },
});

function loadNotesTabsState(): NotesTabsState | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const raw = window.localStorage.getItem(NOTES_TABS_STORAGE_KEY);
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<NotesTabsState>;
    return {
      openTabIds: Array.isArray(parsed.openTabIds) ? parsed.openTabIds : [],
      activeTabId:
        typeof parsed.activeTabId === "string" ? parsed.activeTabId : null,
    };
  } catch {
    return undefined;
  }
}

function loadTasksViewState(): TasksViewState | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const raw = window.localStorage.getItem(TASKS_VIEW_STORAGE_KEY);
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<TasksViewState>;
    return {
      selectedProjectId:
        typeof parsed.selectedProjectId === "string"
          ? parsed.selectedProjectId
          : null,
      expandedTaskId:
        typeof parsed.expandedTaskId === "string"
          ? parsed.expandedTaskId
          : null,
    };
  } catch {
    return undefined;
  }
}

export const store = configureStore({
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(syncRelationsMiddleware.middleware),
  reducer: {
    ...dataReducers,
    notesTabs: notesTabsReducer,
    tasksView: tasksViewReducer,
  },
});

if (typeof window !== "undefined") {
  const preloadedNotesTabsState = loadNotesTabsState();
  if (preloadedNotesTabsState) {
    store.dispatch(
      notesTabsActions.setOpenTabs(preloadedNotesTabsState.openTabIds),
    );
    store.dispatch(
      notesTabsActions.setActiveTab(preloadedNotesTabsState.activeTabId),
    );
  }

  const preloadedTasksViewState = loadTasksViewState();
  if (preloadedTasksViewState) {
    store.dispatch(
      tasksViewActions.setSelectedProjectId(
        preloadedTasksViewState.selectedProjectId,
      ),
    );
    store.dispatch(
      tasksViewActions.setExpandedTaskId(
        preloadedTasksViewState.expandedTaskId,
      ),
    );
  }

  store.subscribe(() => {
    const state = store.getState();
    window.localStorage.setItem(
      NOTES_TABS_STORAGE_KEY,
      JSON.stringify(state.notesTabs),
    );
    window.localStorage.setItem(
      TASKS_VIEW_STORAGE_KEY,
      JSON.stringify(state.tasksView),
    );
  });
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
