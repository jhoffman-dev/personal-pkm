import { ThemeProvider } from "@/components/theme-provider";
import Layout from "@/blocks/app-sidebar/layout";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { loadAppSettings } from "@/lib/app-settings";
import { recordRouteTimingSample } from "@/lib/route-timing-diagnostics";
import { runScheduledNoteLinkProcessingIfDue } from "@/lib/note-linking-queue";
import {
  getLikelyNextRoutes,
  loadDrawingEmbedPage,
  prefetchRouteModule,
} from "@/routes/route-module-loaders";
import { WorkbenchRouteElement } from "@/routes/workbench-route-definitions";
import { WORKBENCH_ROUTE_DEFINITIONS } from "@/routes/workbench-route-config";
import { lazy, Suspense, useEffect, useRef } from "react";

const DrawingEmbedPage = lazy(() =>
  loadDrawingEmbedPage().then((module) => ({
    default: module.DrawingEmbedPage,
  })),
);

function withRouteSuspense(element: React.ReactNode) {
  return (
    <Suspense
      fallback={
        <section className="p-6">
          <p className="text-muted-foreground text-sm">Loading...</p>
        </section>
      }
    >
      {element}
    </Suspense>
  );
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
        <Route
          path="/drawings/:drawingId/embed"
          element={withRouteSuspense(<DrawingEmbedPage />)}
        />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          {WORKBENCH_ROUTE_DEFINITIONS.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={<WorkbenchRouteElement route={route} />}
            />
          ))}
        </Route>
      </Routes>
    </ThemeProvider>
  );
}

export default App;
