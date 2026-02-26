import { ThemeProvider } from "@/components/theme-provider";
import Layout from "@/blocks/app-sidebar/layout";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { loadAppSettings } from "@/lib/app-settings";
import { recordRouteTimingSample } from "@/lib/route-timing-diagnostics";
import { runScheduledNoteLinkProcessingIfDue } from "@/lib/note-linking-queue";
import {
  getLikelyNextRoutes,
  loadAssistantPage,
  loadCalendarPage,
  loadCompaniesPage,
  loadDashboardPage,
  loadGraphPage,
  loadMeetingsPage,
  loadNotesPage,
  loadPeoplePage,
  loadProjectsPage,
  loadTasksPage,
  prefetchRouteModule,
} from "@/routes/route-module-loaders";
import { lazy, Suspense, useEffect, useRef } from "react";

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

function RouteLoadingFallback() {
  return (
    <section className="p-6">
      <p className="text-muted-foreground text-sm">Loading...</p>
    </section>
  );
}

function withRouteSuspense(element: React.ReactNode) {
  return <Suspense fallback={<RouteLoadingFallback />}>{element}</Suspense>;
}

function App() {
  const isRunningScheduledLinkRef = useRef(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const runIfDue = () => {
      if (isRunningScheduledLinkRef.current) {
        return;
      }

      isRunningScheduledLinkRef.current = true;

      void runScheduledNoteLinkProcessingIfDue(loadAppSettings())
        .catch(() => {
          // Silent fail to avoid interrupting UX.
        })
        .finally(() => {
          isRunningScheduledLinkRef.current = false;
        });
    };

    runIfDue();
    const intervalId = window.setInterval(runIfDue, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const baseMark = `route:${pathname}`;
    const startMark = `${baseMark}:start`;
    const endMark = `${baseMark}:end`;
    const measureName = `${baseMark}:paint`;

    if (typeof performance !== "undefined") {
      performance.mark(startMark);
    }

    const rafId = window.requestAnimationFrame(() => {
      if (typeof performance === "undefined") {
        return;
      }

      performance.mark(endMark);

      try {
        const measure = performance.measure(measureName, startMark, endMark);
        recordRouteTimingSample(pathname, measure.duration);
        performance.clearMeasures(measureName);
        performance.clearMarks(startMark);
        performance.clearMarks(endMark);
      } catch {
        // Ignore telemetry measurement errors.
      }
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [pathname]);

  useEffect(() => {
    const likelyRoutes = getLikelyNextRoutes(pathname);
    if (likelyRoutes.length === 0) {
      return;
    }

    const schedulePrefetch = () => {
      likelyRoutes.forEach((route) => {
        prefetchRouteModule(route);
      });
    };

    const requestIdleCallbackFn =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback.bind(window)
        : null;
    const cancelIdleCallbackFn =
      typeof window.cancelIdleCallback === "function"
        ? window.cancelIdleCallback.bind(window)
        : null;

    if (requestIdleCallbackFn && cancelIdleCallbackFn) {
      const idleId = requestIdleCallbackFn(schedulePrefetch, {
        timeout: 1500,
      });

      return () => {
        cancelIdleCallbackFn(idleId);
      };
    }

    const timeoutId = window.setTimeout(schedulePrefetch, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [pathname]);

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route
            path="dashboard"
            element={withRouteSuspense(<DashboardPage />)}
          />
          <Route path="notes" element={withRouteSuspense(<NotesPage />)} />
          <Route path="tasks" element={withRouteSuspense(<TasksPage />)} />
          <Route
            path="meetings"
            element={withRouteSuspense(<MeetingsPage />)}
          />
          <Route
            path="calendar"
            element={withRouteSuspense(<CalendarPage />)}
          />
          <Route
            path="projects"
            element={withRouteSuspense(<ProjectsPage />)}
          />
          <Route
            path="companies"
            element={withRouteSuspense(<CompaniesPage />)}
          />
          <Route path="people" element={withRouteSuspense(<PeoplePage />)} />
          <Route path="graph" element={withRouteSuspense(<GraphPage />)} />
          <Route
            path="assistant"
            element={withRouteSuspense(<AssistantPage />)}
          />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}

export default App;
