/**
 * Scheduled block window for a task.
 *
 * Constraint:
 * - `start` and `end` are ISO datetime strings.
 */
export type TaskTimeblock = {
  start: string;
  end: string;
};

/**
 * Task id keyed map of scheduled timeblocks.
 */
export type TaskTimeblockMap = Record<string, TaskTimeblock>;
