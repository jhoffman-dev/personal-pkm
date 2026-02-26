import {
  planBidirectionalRelationMutations,
  planDetachRelationMutations,
  planInboundCleanupSpecs,
  readRelationIds,
  RELATION_CONFIG,
  relationFieldsFromDefaults,
  uniqueEntityIds,
} from "@/data/shared/relation-domain";
import { describe, expect, it } from "vitest";

describe("relation-domain", () => {
  it("deduplicates and filters relation ids", () => {
    expect(uniqueEntityIds(["a", "", "a", "b"])).toEqual(["a", "b"]);
  });

  it("reads relation ids safely from unknown objects", () => {
    expect(readRelationIds({ noteIds: ["n1", "n2"] }, "noteIds")).toEqual([
      "n1",
      "n2",
    ]);
    expect(readRelationIds({ noteIds: "n1" }, "noteIds")).toEqual([]);
    expect(readRelationIds(null, "noteIds")).toEqual([]);
  });

  it("derives relation field names from defaults", () => {
    const fields = relationFieldsFromDefaults<{
      noteIds: string[];
      taskIds: string[];
    }>({
      noteIds: [],
      taskIds: [],
    });

    expect(fields).toEqual(["noteIds", "taskIds"]);
  });

  it("contains required relation mapping entries", () => {
    expect(RELATION_CONFIG.tasks.projectIds?.targetCollection).toBe("projects");
    expect(RELATION_CONFIG.people.companyIds?.targetField).toBe("personIds");
  });

  it("plans additions/removals for bidirectional relation sync", () => {
    const plan = planBidirectionalRelationMutations({
      collection: "tasks",
      relationFields: ["projectIds", "noteIds"],
      nextEntity: {
        id: "t1",
        projectIds: ["p1", "p2"],
        noteIds: ["n2"],
      },
      previousEntity: {
        id: "t1",
        projectIds: ["p1", "p3"],
        noteIds: ["n1", "n2"],
      },
    });

    expect(plan.additions.map((item) => item.relatedId)).toEqual(["p2"]);
    expect(plan.removals.map((item) => item.relatedId).sort()).toEqual([
      "n1",
      "p3",
    ]);
  });

  it("plans detach mutations and inbound cleanup specs", () => {
    const detachPlan = planDetachRelationMutations({
      collection: "meetings",
      relationFields: ["taskIds"],
      deletedEntity: {
        id: "m1",
        taskIds: ["t1", "t2"],
      },
    });

    expect(detachPlan.map((item) => item.relatedId)).toEqual(["t1", "t2"]);

    const inboundSpecs = planInboundCleanupSpecs("companies");
    expect(
      inboundSpecs.some(
        (spec) =>
          spec.sourceCollection === "projects" &&
          spec.sourceField === "companyIds",
      ),
    ).toBe(true);
  });
});
