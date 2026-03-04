import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  getRouteTimingSnapshot,
  resetRouteTimingDiagnostics,
  type RouteTimingSummary,
} from "@/lib/route-timing-diagnostics";

const POLL_INTERVAL_MS = 2000;

type RouteTimingRow = RouteTimingSummary & {
  avgDeltaMs?: number;
};

interface DevRouteTimingPanelProps {
  mode?: "floating" | "docked";
}

export function DevRouteTimingPanel({
  mode = "floating",
}: DevRouteTimingPanelProps) {
  const isDocked = mode === "docked";
  const [isFloatingOpen, setIsFloatingOpen] = useState(false);
  const [rows, setRows] = useState<RouteTimingRow[]>(() =>
    getRouteTimingSnapshot().map((summary) => ({
      ...summary,
      avgDeltaMs: undefined,
    })),
  );

  const refresh = useCallback(() => {
    setRows((previousRows) => {
      const previousAvgByRoute = new Map(
        previousRows.map((row) => [row.route, row.avgMs]),
      );

      return getRouteTimingSnapshot().map((summary) => ({
        ...summary,
        avgDeltaMs: previousAvgByRoute.has(summary.route)
          ? summary.avgMs -
            (previousAvgByRoute.get(summary.route) ?? summary.avgMs)
          : undefined,
      }));
    });
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(refresh, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  const hasData = rows.length > 0;

  const sortedRows = useMemo(() => {
    return [...rows].sort((left, right) => right.avgMs - left.avgMs);
  }, [rows]);

  const formatDelta = (value: number | undefined): string => {
    if (value === undefined) {
      return "—";
    }

    if (Math.abs(value) < 0.05) {
      return "0.0 ms";
    }

    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(1)} ms`;
  };

  if (!import.meta.env.DEV) {
    return null;
  }

  if (!isDocked && !isFloatingOpen) {
    return (
      <div className="fixed right-6 bottom-24 z-50">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setIsFloatingOpen(true)}
        >
          Route Timing
        </Button>
      </div>
    );
  }

  return (
    <div
      className={
        isDocked
          ? "flex h-full min-h-0 flex-col bg-background p-3"
          : "fixed right-6 bottom-24 z-50 flex w-[36rem] max-w-[calc(100vw-2rem)] flex-col rounded-md border bg-background p-3 shadow-sm"
      }
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Route Timing Diagnostics</p>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={refresh}>
            Refresh
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              resetRouteTimingDiagnostics();
              refresh();
            }}
          >
            Reset
          </Button>
          {!isDocked ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsFloatingOpen(false)}
            >
              Hide
            </Button>
          ) : null}
        </div>
      </div>

      {!hasData ? (
        <p className="text-sm text-muted-foreground">
          No route timing samples yet.
        </p>
      ) : (
        <div
          className={
            isDocked ? "min-h-0 flex-1 overflow-auto" : "max-h-72 overflow-auto"
          }
        >
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b">
                <th className="px-2 py-1 font-medium">Route</th>
                <th className="px-2 py-1 font-medium">Count</th>
                <th className="px-2 py-1 font-medium">Avg</th>
                <th className="px-2 py-1 font-medium">Δ Avg</th>
                <th className="px-2 py-1 font-medium">P50</th>
                <th className="px-2 py-1 font-medium">P95</th>
                <th className="px-2 py-1 font-medium">Min</th>
                <th className="px-2 py-1 font-medium">Max</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((summary) => (
                <tr key={summary.route} className="border-b last:border-b-0">
                  <td className="px-2 py-1">{summary.route}</td>
                  <td className="px-2 py-1">{summary.count}</td>
                  <td className="px-2 py-1">{summary.avgMs.toFixed(1)} ms</td>
                  <td className="px-2 py-1 text-muted-foreground">
                    {formatDelta(summary.avgDeltaMs)}
                  </td>
                  <td className="px-2 py-1">{summary.p50Ms.toFixed(1)} ms</td>
                  <td className="px-2 py-1">{summary.p95Ms.toFixed(1)} ms</td>
                  <td className="px-2 py-1">{summary.minMs.toFixed(1)} ms</td>
                  <td className="px-2 py-1">{summary.maxMs.toFixed(1)} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
