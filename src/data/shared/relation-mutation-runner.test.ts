import {
  applyBidirectionalRelationMutations,
  applyDetachRelationMutations,
  applyInboundCleanupSpecs,
} from "@/data/shared/relation-mutation-runner";
import { describe, expect, it } from "vitest";

describe("relation-mutation-runner", () => {
  it("executes bidirectional add/remove callbacks from planned mutations", async () => {
    const added: string[] = [];
    const removed: string[] = [];

    await applyBidirectionalRelationMutations({
      collection: "tasks",
      relationFields: ["projectIds"],
      nextEntity: { id: "t1", projectIds: ["p1", "p2"] },
      previousEntity: { id: "t1", projectIds: ["p1", "p3"] },
      onAdd: (mutation) => {
        added.push(mutation.relatedId);
      },
      onRemove: async (mutation) => {
        removed.push(mutation.relatedId);
      },
    });

    expect(added).toEqual(["p2"]);
    expect(removed).toEqual(["p3"]);
  });

  it("executes detach removals", async () => {
    const removed: string[] = [];

    await applyDetachRelationMutations({
      collection: "meetings",
      relationFields: ["taskIds"],
      deletedEntity: { id: "m1", taskIds: ["t1", "t2"] },
      onRemove: (mutation) => {
        removed.push(mutation.relatedId);
      },
    });

    expect(removed).toEqual(["t1", "t2"]);
  });

  it("iterates inbound cleanup specs", async () => {
    const specs: string[] = [];

    await applyInboundCleanupSpecs({
      targetCollection: "companies",
      onSpec: (spec) => {
        specs.push(`${spec.sourceCollection}:${spec.sourceField}`);
      },
    });

    expect(specs).toContain("projects:companyIds");
    expect(specs).toContain("people:companyIds");
  });
});
