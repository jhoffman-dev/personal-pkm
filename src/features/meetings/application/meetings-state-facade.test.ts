import { meetingsStateFacade, useMeetingsStore } from "@/features/meetings";
import { beforeEach, describe, expect, it } from "vitest";

describe("meetings state facade", () => {
  beforeEach(() => {
    meetingsStateFacade.setSelectedMeetingId(null);
  });

  it("sets selected meeting id through facade command", () => {
    meetingsStateFacade.setSelectedMeetingId("meeting-1");

    expect(useMeetingsStore.getState().selectedMeetingId).toBe("meeting-1");
  });
});
