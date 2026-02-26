import {
  isTaskTimeblockStale,
  resolveTaskTimeblockDefaultMinutes,
} from "@/features/task-timeblocking/domain/task-timeblock-policy";
import { describe, expect, it } from "vitest";

describe("task-timeblock-policy", () => {
  it("detects stale timeblocks when block date is before today", () => {
    const stale = isTaskTimeblockStale(
      {
        start: "2026-02-20T09:00:00.000Z",
        end: "2026-02-20T09:30:00.000Z",
      },
      new Date("2026-02-26T12:00:00.000Z"),
    );

    expect(stale).toBe(true);
  });

  it("does not mark same-day blocks as stale", () => {
    const stale = isTaskTimeblockStale(
      {
        start: "2026-02-26T00:10:00",
        end: "2026-02-26T00:40:00",
      },
      new Date("2026-02-26T20:00:00"),
    );

    expect(stale).toBe(false);
  });

  it("normalizes default duration to valid 10-minute increments", () => {
    expect(resolveTaskTimeblockDefaultMinutes(undefined)).toBe(30);
    expect(resolveTaskTimeblockDefaultMinutes(7)).toBe(10);
    expect(resolveTaskTimeblockDefaultMinutes(23)).toBe(20);
    expect(resolveTaskTimeblockDefaultMinutes(57)).toBe(60);
    expect(resolveTaskTimeblockDefaultMinutes(130)).toBe(60);
  });
});
