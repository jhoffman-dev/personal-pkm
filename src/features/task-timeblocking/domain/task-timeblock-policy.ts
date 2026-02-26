import type { TaskTimeblock } from "@/features/task-timeblocking/domain/task-timeblock";

const DEFAULT_DURATION_MINUTES = 30;
const MIN_DURATION_MINUTES = 10;
const MAX_DURATION_MINUTES = 60;
const DURATION_STEP_MINUTES = 10;

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

export function resolveTaskTimeblockDefaultMinutes(value?: number): number {
  if (!value || !Number.isFinite(value)) {
    return DEFAULT_DURATION_MINUTES;
  }

  const clamped = Math.min(
    MAX_DURATION_MINUTES,
    Math.max(MIN_DURATION_MINUTES, value),
  );

  const snapped =
    Math.round(clamped / DURATION_STEP_MINUTES) * DURATION_STEP_MINUTES;

  return Math.min(
    MAX_DURATION_MINUTES,
    Math.max(MIN_DURATION_MINUTES, snapped),
  );
}
