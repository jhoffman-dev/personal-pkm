import {
  WORKBENCH_ROUTE_DEFINITIONS,
  type WorkbenchRouteDefinition,
} from "@/routes/workbench-route-config";
import { Suspense } from "react";
import { Route, Routes } from "react-router-dom";

function RouteLoadingFallback() {
  return (
    <section className="p-6">
      <p className="text-muted-foreground text-sm">Loading...</p>
    </section>
  );
}

interface WorkbenchRouteElementProps {
  route: WorkbenchRouteDefinition;
}

export function WorkbenchRouteElement({ route }: WorkbenchRouteElementProps) {
  const RouteComponent = route.component;
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <RouteComponent />
    </Suspense>
  );
}

interface WorkbenchRouteHostProps {
  pathname: string;
}

export function WorkbenchRouteHost({ pathname }: WorkbenchRouteHostProps) {
  return (
    <Routes location={pathname}>
      {WORKBENCH_ROUTE_DEFINITIONS.map((route) => (
        <Route
          key={route.path}
          path={`/${route.path}`}
          element={<WorkbenchRouteElement route={route} />}
        />
      ))}
      <Route
        path="*"
        element={
          <section className="p-6">
            <p className="text-muted-foreground text-sm">Route unavailable.</p>
          </section>
        }
      />
    </Routes>
  );
}
