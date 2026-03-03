import { beforeEach, describe, expect, it, vi } from "vitest";

let idCounter = 0;

vi.mock("@/data/types", async () => {
  const actual =
    await vi.importActual<typeof import("@/data/types")>("@/data/types");

  return {
    ...actual,
    nowIsoDate: () => "2026-03-02T00:00:00.000Z",
    createEntityId: (prefix: string) => {
      idCounter += 1;
      return `${prefix}_test_${idCounter}`;
    },
  };
});

import { createLocalDataModules } from "@/data/local/local-data-modules";

describe("createLocalDataModules", () => {
  beforeEach(() => {
    idCounter = 0;
  });

  it("creates records with deterministic ids and timestamps", async () => {
    const modules = createLocalDataModules();

    const person = await modules.people.create({
      firstName: "Ada",
      lastName: "Lovelace",
      tags: [],
      companyIds: [],
      projectIds: [],
      noteIds: [],
      taskIds: [],
      meetingIds: [],
    });

    expect(person.id).toBe("person_test_1");
    expect(person.createdAt).toBe("2026-03-02T00:00:00.000Z");
    expect(person.updatedAt).toBe("2026-03-02T00:00:00.000Z");
  });

  it("normalizes duplicate relation ids and syncs reverse links", async () => {
    const modules = createLocalDataModules();

    const person = await modules.people.create({
      firstName: "Grace",
      lastName: "Hopper",
      tags: [],
      companyIds: [],
      projectIds: [],
      noteIds: [],
      taskIds: [],
      meetingIds: [],
    });

    const project = await modules.projects.create({
      name: "Compiler",
      paraType: "project",
      tags: [],
      personIds: [person.id, person.id],
      companyIds: [],
      noteIds: [],
      taskIds: [],
      meetingIds: [],
    });

    expect(project.personIds).toEqual([person.id]);

    const updatedPerson = await modules.people.getById(person.id);
    expect(updatedPerson?.projectIds).toEqual([project.id]);
  });

  it("returns associated records and cleans reverse links on delete", async () => {
    const modules = createLocalDataModules();

    const person = await modules.people.create({
      firstName: "Barbara",
      lastName: "Liskov",
      tags: [],
      companyIds: [],
      projectIds: [],
      noteIds: [],
      taskIds: [],
      meetingIds: [],
    });

    const project = await modules.projects.create({
      name: "LSP",
      paraType: "project",
      tags: [],
      personIds: [person.id],
      companyIds: [],
      noteIds: [],
      taskIds: [],
      meetingIds: [],
    });

    const associated = await modules.projects.getAssociatedRecords(project.id);
    expect(associated?.people.map((item) => item.id)).toEqual([person.id]);

    const deleted = await modules.projects.delete(project.id);
    expect(deleted).toBe(true);

    const personAfterDelete = await modules.people.getById(person.id);
    expect(personAfterDelete?.projectIds).toEqual([]);
  });
});
