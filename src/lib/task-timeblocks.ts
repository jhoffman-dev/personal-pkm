import {
  isTaskTimeblockStale,
  resolveTaskTimeblockDefaultMinutes,
  taskTimeblockService,
  TASK_TIMEBLOCKS_STORAGE_KEY,
  type TaskTimeblock,
  type TaskTimeblockMap,
} from "@/features/task-timeblocking";

export {
  TASK_TIMEBLOCKS_STORAGE_KEY,
  isTaskTimeblockStale,
  resolveTaskTimeblockDefaultMinutes,
};
export type { TaskTimeblock, TaskTimeblockMap };

export function loadTaskTimeblocks(): TaskTimeblockMap {
  return taskTimeblockService.load();
}

export function saveTaskTimeblocks(blocks: TaskTimeblockMap): void {
  taskTimeblockService.save(blocks);
}

export function toDateTimeLocalValue(isoDateString?: string): string {
  return taskTimeblockService.toDateTimeLocalValue(isoDateString);
}

export function fromDateTimeLocalValue(value: string): string | null {
  return taskTimeblockService.fromDateTimeLocalValue(value);
}
