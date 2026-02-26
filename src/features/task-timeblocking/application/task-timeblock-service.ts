import type { TaskTimeblockRepository } from "@/features/task-timeblocking/application/task-timeblock-repository";
import {
  isTaskTimeblockStale,
  resolveTaskTimeblockDefaultMinutes,
} from "@/features/task-timeblocking/domain/task-timeblock-policy";
import type {
  TaskTimeblock,
  TaskTimeblockMap,
} from "@/features/task-timeblocking/domain/task-timeblock";

export class TaskTimeblockService {
  private readonly repository: TaskTimeblockRepository;

  constructor(repository: TaskTimeblockRepository) {
    this.repository = repository;
  }

  load(): TaskTimeblockMap {
    return this.repository.load();
  }

  save(blocks: TaskTimeblockMap): void {
    this.repository.save(blocks);
  }

  upsert(taskId: string, block: TaskTimeblock): TaskTimeblockMap {
    const next = {
      ...this.load(),
      [taskId]: block,
    };
    this.save(next);
    return next;
  }

  remove(taskId: string): TaskTimeblockMap {
    const current = this.load();
    if (!current[taskId]) {
      return current;
    }

    const next = { ...current };
    delete next[taskId];
    this.save(next);
    return next;
  }

  pruneStaleIncomplete(
    blocks: TaskTimeblockMap,
    isTaskIncomplete: (taskId: string) => boolean,
    now = new Date(),
  ): TaskTimeblockMap {
    let changed = false;
    const next: TaskTimeblockMap = { ...blocks };

    Object.entries(blocks).forEach(([taskId, block]) => {
      if (isTaskIncomplete(taskId) && isTaskTimeblockStale(block, now)) {
        delete next[taskId];
        changed = true;
      }
    });

    if (!changed) {
      return blocks;
    }

    this.save(next);
    return next;
  }

  toDateTimeLocalValue(isoDateString?: string): string {
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

  fromDateTimeLocalValue(value: string): string | null {
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

  resolveDefaultDurationMinutes(value?: number): number {
    return resolveTaskTimeblockDefaultMinutes(value);
  }
}
