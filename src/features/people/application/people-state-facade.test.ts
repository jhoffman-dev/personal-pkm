import { peopleStateFacade, usePeopleStore } from "@/features/people";
import { beforeEach, describe, expect, it } from "vitest";

describe("people state facade", () => {
  beforeEach(() => {
    peopleStateFacade.setSelectedPersonId(null);
  });

  it("sets selected person id through facade command", () => {
    peopleStateFacade.setSelectedPersonId("person-1");

    expect(usePeopleStore.getState().selectedPersonId).toBe("person-1");
  });
});
