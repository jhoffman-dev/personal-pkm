import { projectsStateFacade, useProjectsStore } from "@/features/projects";
import { beforeEach, describe, expect, it } from "vitest";

describe("projects state facade", () => {
  beforeEach(() => {
    projectsStateFacade.setSelectedProjectId(null);
  });

  it("sets selected project id through facade command", () => {
    projectsStateFacade.setSelectedProjectId("project-1");

    expect(useProjectsStore.getState().selectedProjectId).toBe("project-1");
  });
});
