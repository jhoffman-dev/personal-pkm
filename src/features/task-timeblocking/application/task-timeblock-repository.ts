import type { TaskTimeblockMap } from "@/features/task-timeblocking/domain/task-timeblock";

export interface TaskTimeblockRepository {
  load(): TaskTimeblockMap;
  save(blocks: TaskTimeblockMap): void;
}
