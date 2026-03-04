export type RuntimeLogLevel = "log" | "info" | "warn" | "error" | "debug";

export type RuntimeLogSource =
  | "console"
  | "window-error"
  | "unhandled-rejection";

/**
 * Snapshot entry shown in the workbench Output panel.
 *
 * Invariants:
 * - `id` is monotonic per renderer process.
 * - `timestampMs` is Unix epoch milliseconds.
 * - `message` is already serialized for display.
 */
export interface RuntimeLogEntry {
  id: number;
  timestampMs: number;
  level: RuntimeLogLevel;
  source: RuntimeLogSource;
  message: string;
}

type RuntimeLogListener = (entries: RuntimeLogEntry[]) => void;

interface RuntimeLogStreamState {
  entries: RuntimeLogEntry[];
  listeners: Set<RuntimeLogListener>;
  nextId: number;
  initialized: boolean;
}

interface RuntimeLogGlobalState {
  __pkmRuntimeLogStreamState?: RuntimeLogStreamState;
}

const MAX_RUNTIME_LOG_ENTRIES = 400;
const CONSOLE_METHODS: RuntimeLogLevel[] = [
  "log",
  "info",
  "warn",
  "error",
  "debug",
];

function getRuntimeLogStreamState(): RuntimeLogStreamState {
  const runtimeGlobal = globalThis as typeof globalThis & RuntimeLogGlobalState;

  if (!runtimeGlobal.__pkmRuntimeLogStreamState) {
    runtimeGlobal.__pkmRuntimeLogStreamState = {
      entries: [],
      listeners: new Set<RuntimeLogListener>(),
      nextId: 1,
      initialized: false,
    };
  }

  return runtimeGlobal.__pkmRuntimeLogStreamState;
}

function serializeLogValue(value: unknown): string {
  if (value instanceof Error) {
    return value.stack ?? `${value.name}: ${value.message}`;
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }

  if (value === null || value === undefined) {
    return String(value);
  }

  if (typeof value === "function") {
    return `[Function ${value.name || "anonymous"}]`;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

function emitRuntimeLogEntries(state: RuntimeLogStreamState): void {
  const snapshot = [...state.entries];
  state.listeners.forEach((listener) => {
    listener(snapshot);
  });
}

function appendRuntimeLogEntry(
  level: RuntimeLogLevel,
  source: RuntimeLogSource,
  values: unknown[],
): void {
  const state = getRuntimeLogStreamState();

  const message = values.map((value) => serializeLogValue(value)).join(" ");
  const nextEntries = [
    ...state.entries,
    {
      id: state.nextId,
      timestampMs: Date.now(),
      level,
      source,
      message,
    },
  ];

  state.nextId += 1;
  state.entries = nextEntries.slice(-MAX_RUNTIME_LOG_ENTRIES);
  emitRuntimeLogEntries(state);
}

/**
 * Starts runtime log capture for the current renderer process.
 *
 * Tradeoff:
 * - Console method monkey-patching keeps integration lightweight.
 * - A global singleton avoids duplicate patching during HMR reloads.
 */
export function ensureRuntimeLogCaptureStarted(): void {
  if (typeof window === "undefined") {
    return;
  }

  const state = getRuntimeLogStreamState();
  if (state.initialized) {
    return;
  }

  state.initialized = true;

  CONSOLE_METHODS.forEach((methodName) => {
    const nativeMethod = console[methodName].bind(console) as (
      ...args: unknown[]
    ) => void;

    (console as Record<string, (...args: unknown[]) => void>)[methodName] = (
      ...args: unknown[]
    ) => {
      nativeMethod(...args);
      appendRuntimeLogEntry(methodName, "console", args);
    };
  });

  window.addEventListener("error", (event) => {
    const value = event.error ?? event.message;
    appendRuntimeLogEntry("error", "window-error", [value]);
  });

  window.addEventListener("unhandledrejection", (event) => {
    appendRuntimeLogEntry("error", "unhandled-rejection", [event.reason]);
  });
}

/**
 * Returns a copy of currently buffered runtime log entries.
 */
export function getRuntimeLogSnapshot(): RuntimeLogEntry[] {
  return [...getRuntimeLogStreamState().entries];
}

/**
 * Subscribes to runtime log updates.
 *
 * Listener is called immediately with the current snapshot.
 */
export function subscribeToRuntimeLogs(
  listener: RuntimeLogListener,
): () => void {
  const state = getRuntimeLogStreamState();
  state.listeners.add(listener);
  listener([...state.entries]);

  return () => {
    state.listeners.delete(listener);
  };
}

/**
 * Clears buffered runtime logs for the active renderer process.
 */
export function clearRuntimeLogs(): void {
  const state = getRuntimeLogStreamState();
  state.entries = [];
  emitRuntimeLogEntries(state);
}
