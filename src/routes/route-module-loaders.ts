type RouteModuleLoader = () => Promise<unknown>;

export const loadDashboardPage = () => import("@/pages/dashboard-page");
export const loadNotesPage = () => import("@/pages/notes-page");
export const loadDrawingsPage = () => import("@/pages/drawings-page");
export const loadTasksPage = () => import("@/pages/tasks-page");
export const loadMeetingsPage = () => import("@/pages/meetings-page");
export const loadCalendarPage = () => import("@/pages/calendar-page");
export const loadProjectsPage = () => import("@/pages/projects-page");
export const loadCompaniesPage = () => import("@/pages/companies-page");
export const loadPeoplePage = () => import("@/pages/people-page");
export const loadGraphPage = () => import("@/pages/graph-page");
export const loadAssistantPage = () => import("@/pages/assistant-page");
export const loadDrawingEmbedPage = () => import("@/pages/drawing-embed-page");

const routeModuleLoaders: Record<string, RouteModuleLoader> = {
  "/dashboard": loadDashboardPage,
  "/notes": loadNotesPage,
  "/drawings": loadDrawingsPage,
  "/tasks": loadTasksPage,
  "/meetings": loadMeetingsPage,
  "/calendar": loadCalendarPage,
  "/projects": loadProjectsPage,
  "/companies": loadCompaniesPage,
  "/people": loadPeoplePage,
  "/graph": loadGraphPage,
  "/assistant": loadAssistantPage,
  "/drawings/embed": loadDrawingEmbedPage,
};

const prefetchedRoutes = new Set<string>();

function resolvePrefetchRoute(pathname: string): string | null {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;

  if (routeModuleLoaders[normalized]) {
    return normalized;
  }

  const matched = Object.keys(routeModuleLoaders).find(
    (route) => normalized === route || normalized.startsWith(`${route}/`),
  );

  return matched ?? null;
}

export function prefetchRouteModule(pathname: string): void {
  const route = resolvePrefetchRoute(pathname);
  if (!route || prefetchedRoutes.has(route)) {
    return;
  }

  prefetchedRoutes.add(route);

  void routeModuleLoaders[route]().catch(() => {
    prefetchedRoutes.delete(route);
  });
}

const likelyNextRoutesByRoute: Record<string, string[]> = {
  "/dashboard": ["/notes", "/drawings", "/tasks", "/assistant"],
  "/notes": ["/drawings", "/tasks", "/assistant"],
  "/drawings": ["/notes", "/tasks"],
  "/tasks": ["/calendar", "/projects"],
  "/meetings": ["/calendar", "/companies", "/people"],
  "/calendar": ["/tasks", "/meetings"],
  "/projects": ["/tasks", "/companies", "/people"],
  "/companies": ["/people", "/meetings"],
  "/people": ["/companies", "/meetings"],
  "/graph": ["/projects", "/notes"],
  "/assistant": ["/notes", "/tasks"],
};

export function getLikelyNextRoutes(pathname: string): string[] {
  const route = resolvePrefetchRoute(pathname);
  if (!route) {
    return [];
  }

  return likelyNextRoutesByRoute[route] ?? [];
}
