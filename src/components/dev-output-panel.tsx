import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  clearRuntimeLogs,
  ensureRuntimeLogCaptureStarted,
  getRuntimeLogSnapshot,
  subscribeToRuntimeLogs,
  type RuntimeLogEntry,
} from "@/lib/runtime-log-stream";

const MAX_VISIBLE_ENTRIES = 250;

function formatTimestamp(timestampMs: number): string {
  const value = new Date(timestampMs);
  return value.toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getLevelLabelClassName(level: RuntimeLogEntry["level"]): string {
  if (level === "error") {
    return "text-destructive font-medium";
  }

  if (level === "warn") {
    return "text-foreground font-medium";
  }

  return "text-muted-foreground";
}

export function DevOutputPanel() {
  const [entries, setEntries] = useState<RuntimeLogEntry[]>(() =>
    getRuntimeLogSnapshot(),
  );

  useEffect(() => {
    ensureRuntimeLogCaptureStarted();
    return subscribeToRuntimeLogs(setEntries);
  }, []);

  const visibleEntries = useMemo(
    () => entries.slice(-MAX_VISIBLE_ENTRIES),
    [entries],
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-background p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Runtime Output</p>
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground text-xs">
            {visibleEntries.length} entries
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              clearRuntimeLogs();
            }}
          >
            Clear
          </Button>
        </div>
      </div>

      {visibleEntries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No runtime logs yet.</p>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-md border">
          <ul className="divide-y">
            {visibleEntries.map((entry) => (
              <li
                key={entry.id}
                className="grid grid-cols-[auto_auto_1fr] gap-3 px-3 py-1.5 text-xs"
              >
                <span className="text-muted-foreground tabular-nums">
                  {formatTimestamp(entry.timestampMs)}
                </span>
                <span className={getLevelLabelClassName(entry.level)}>
                  {entry.level.toUpperCase()}
                </span>
                <span className="font-mono whitespace-pre-wrap break-words">
                  {entry.source === "console"
                    ? entry.message
                    : `[${entry.source}] ${entry.message}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
