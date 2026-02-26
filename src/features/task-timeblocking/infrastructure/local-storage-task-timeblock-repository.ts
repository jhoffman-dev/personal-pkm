import type { TaskTimeblockRepository } from "@/features/task-timeblocking/application/task-timeblock-repository";
import type { TaskTimeblockMap } from "@/features/task-timeblocking/domain/task-timeblock";

export const TASK_TIMEBLOCKS_STORAGE_KEY = "pkm.calendar.task-timeblocks.v1";

export class LocalStorageTaskTimeblockRepository implements TaskTimeblockRepository {
  private readonly storageKey: string;

  constructor(storageKey = TASK_TIMEBLOCKS_STORAGE_KEY) {
    this.storageKey = storageKey;
  }

  load(): TaskTimeblockMap {
    if (typeof window === "undefined") {
      return {};
    }

    const raw = window.localStorage.getItem(this.storageKey);
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

  save(blocks: TaskTimeblockMap): void {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(this.storageKey, JSON.stringify(blocks));
  }
}
