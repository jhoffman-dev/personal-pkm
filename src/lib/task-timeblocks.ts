export const TASK_TIMEBLOCKS_STORAGE_KEY = "pkm.calendar.task-timeblocks.v1";

export type TaskTimeblock = {
  start: string;
  end: string;
};

export type TaskTimeblockMap = Record<string, TaskTimeblock>;

export function loadTaskTimeblocks(): TaskTimeblockMap {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(TASK_TIMEBLOCKS_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as TaskTimeblockMap;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export function saveTaskTimeblocks(blocks: TaskTimeblockMap): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    TASK_TIMEBLOCKS_STORAGE_KEY,
    JSON.stringify(blocks),
  );
}

export function toDateTimeLocalValue(isoDateString?: string): string {
  if (!isoDateString) {
    return "";
  }

  const date = new Date(isoDateString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (value: number) => value.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function fromDateTimeLocalValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function toLocalDateKey(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const pad = (part: number) => part.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isTaskTimeblockStale(
  block: TaskTimeblock,
  now = new Date(),
): boolean {
  const blockDateKey = toLocalDateKey(block.start);
  if (!blockDateKey) {
    return false;
  }

  const pad = (part: number) => part.toString().padStart(2, "0");
  const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  return blockDateKey < todayKey;
}
