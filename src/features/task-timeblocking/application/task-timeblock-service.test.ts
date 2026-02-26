import { TaskTimeblockService } from "@/features/task-timeblocking/application/task-timeblock-service";
import type { TaskTimeblockRepository } from "@/features/task-timeblocking/application/task-timeblock-repository";
import type { TaskTimeblockMap } from "@/features/task-timeblocking/domain/task-timeblock";
import { describe, expect, it } from "vitest";

class InMemoryTaskTimeblockRepository implements TaskTimeblockRepository {
  private blocks: TaskTimeblockMap;

  constructor(blocks: TaskTimeblockMap = {}) {
    this.blocks = blocks;
  }

  load(): TaskTimeblockMap {
    return this.blocks;
  }

  save(blocks: TaskTimeblockMap): void {
    this.blocks = blocks;
  }
}

describe("TaskTimeblockService", () => {
  it("prunes stale blocks only for incomplete tasks", () => {
    const repository = new InMemoryTaskTimeblockRepository({
      incompleteOld: {
        start: "2026-02-25T09:00:00.000Z",
        end: "2026-02-25T09:30:00.000Z",
      },
      completeOld: {
        start: "2026-02-25T10:00:00.000Z",
        end: "2026-02-25T10:30:00.000Z",
      },
      incompleteToday: {
        start: "2026-02-26T11:00:00.000Z",
        end: "2026-02-26T11:30:00.000Z",
      },
    });

    const service = new TaskTimeblockService(repository);
    const next = service.pruneStaleIncomplete(
      repository.load(),
      (taskId) => taskId !== "completeOld",
      new Date("2026-02-26T12:00:00.000Z"),
    );

    expect(next.incompleteOld).toBeUndefined();
    expect(next.completeOld).toBeDefined();
    expect(next.incompleteToday).toBeDefined();
  });
});
