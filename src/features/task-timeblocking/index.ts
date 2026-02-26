import { TaskTimeblockService } from "@/features/task-timeblocking/application/task-timeblock-service";
import { LocalStorageTaskTimeblockRepository } from "@/features/task-timeblocking/infrastructure/local-storage-task-timeblock-repository";

export type {
  TaskTimeblock,
  TaskTimeblockMap,
} from "@/features/task-timeblocking/domain/task-timeblock";
export {
  isTaskTimeblockStale,
  resolveTaskTimeblockDefaultMinutes,
} from "@/features/task-timeblocking/domain/task-timeblock-policy";
export { TASK_TIMEBLOCKS_STORAGE_KEY } from "@/features/task-timeblocking/infrastructure/local-storage-task-timeblock-repository";

export const taskTimeblockService = new TaskTimeblockService(
  new LocalStorageTaskTimeblockRepository(),
);
