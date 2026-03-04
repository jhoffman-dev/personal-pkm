import {
  loadAssistantPage,
  loadBrowserPage,
  loadCalendarPage,
  loadCompaniesPage,
  loadDashboardPage,
  loadDrawingsPage,
  loadGraphPage,
  loadMeetingsPage,
  loadNotesPage,
  loadObjectsPage,
  loadObjectTypesPage,
  loadPeoplePage,
  loadProjectsPage,
  loadTasksPage,
} from "@/routes/route-module-loaders";
import { lazy, type ComponentType, type LazyExoticComponent } from "react";

const DashboardPage = lazy(() =>
  loadDashboardPage().then((module) => ({
    default: module.DashboardPage,
  })),
);
const NotesPage = lazy(() =>
  loadNotesPage().then((module) => ({
    default: module.NotesPage,
  })),
);
const DrawingsPage = lazy(() =>
  loadDrawingsPage().then((module) => ({
    default: module.DrawingsPage,
  })),
);
const BrowserPage = lazy(() =>
  loadBrowserPage().then((module) => ({
    default: module.BrowserPage,
  })),
);
const TasksPage = lazy(() =>
  loadTasksPage().then((module) => ({
    default: module.TasksPage,
  })),
);
const MeetingsPage = lazy(() =>
  loadMeetingsPage().then((module) => ({
    default: module.MeetingsPage,
  })),
);
const CalendarPage = lazy(() =>
  loadCalendarPage().then((module) => ({
    default: module.CalendarPage,
  })),
);
const ProjectsPage = lazy(() =>
  loadProjectsPage().then((module) => ({
    default: module.ProjectsPage,
  })),
);
const CompaniesPage = lazy(() =>
  loadCompaniesPage().then((module) => ({
    default: module.CompaniesPage,
  })),
);
const PeoplePage = lazy(() =>
  loadPeoplePage().then((module) => ({
    default: module.PeoplePage,
  })),
);
const ObjectTypesPage = lazy(() =>
  loadObjectTypesPage().then((module) => ({
    default: module.ObjectTypesPage,
  })),
);
const ObjectsPage = lazy(() =>
  loadObjectsPage().then((module) => ({
    default: module.ObjectsPage,
  })),
);
const GraphPage = lazy(() =>
  loadGraphPage().then((module) => ({
    default: module.GraphPage,
  })),
);
const AssistantPage = lazy(() =>
  loadAssistantPage().then((module) => ({
    default: module.AssistantPage,
  })),
);

export interface WorkbenchRouteDefinition {
  path: string;
  component: LazyExoticComponent<ComponentType>;
}

export const WORKBENCH_ROUTE_DEFINITIONS: WorkbenchRouteDefinition[] = [
  {
    path: "dashboard",
    component: DashboardPage,
  },
  {
    path: "notes",
    component: NotesPage,
  },
  {
    path: "drawings",
    component: DrawingsPage,
  },
  {
    path: "drawings/:drawingId",
    component: DrawingsPage,
  },
  {
    path: "browser",
    component: BrowserPage,
  },
  {
    path: "tasks",
    component: TasksPage,
  },
  {
    path: "meetings",
    component: MeetingsPage,
  },
  {
    path: "calendar",
    component: CalendarPage,
  },
  {
    path: "projects",
    component: ProjectsPage,
  },
  {
    path: "companies",
    component: CompaniesPage,
  },
  {
    path: "people",
    component: PeoplePage,
  },
  {
    path: "object-types",
    component: ObjectTypesPage,
  },
  {
    path: "objects",
    component: ObjectsPage,
  },
  {
    path: "graph",
    component: GraphPage,
  },
  {
    path: "assistant",
    component: AssistantPage,
  },
];
