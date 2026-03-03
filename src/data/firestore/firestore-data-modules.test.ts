import { beforeEach, describe, expect, it, vi } from "vitest";

type WhereClause = {
  field: string;
  op: "in" | "array-contains";
  value: unknown;
};

type CollectionRef = {
  kind: "collection";
  path: string;
};

type DocRef = {
  kind: "doc";
  path: string;
  id: string;
};

type QueryRef = {
  kind: "query";
  collectionPath: string;
  clauses: WhereClause[];
};

const hoisted = vi.hoisted(() => {
  const firestoreState = new Map<string, Record<string, unknown>>();
  const counter = { value: 0 };

  const setDocMock = vi.fn(
    async (reference: DocRef, value: Record<string, unknown>) => {
      firestoreState.set(reference.path, value);
    },
  );

  const getDocMock = vi.fn(async (reference: DocRef) => {
    const value = firestoreState.get(reference.path);
    return {
      exists: () => Boolean(value),
      data: () => value,
    };
  });

  const deleteDocMock = vi.fn(async (reference: DocRef) => {
    firestoreState.delete(reference.path);
  });

  const getDocsMock = vi.fn(async (reference: CollectionRef | QueryRef) => {
    const toSnapshot = (entries: Array<[string, Record<string, unknown>]>) => ({
      docs: entries.map(([path, value]) => ({
        id: path.split("/").at(-1) ?? "",
        data: () => value,
        ref: { path },
      })),
    });

    if (reference.kind === "collection") {
      const prefix = `${reference.path}/`;
      const entries = Array.from(firestoreState.entries()).filter(([path]) =>
        path.startsWith(prefix),
      );
      return toSnapshot(entries);
    }

    let entries = Array.from(firestoreState.entries()).filter(([path]) =>
      path.startsWith(`${reference.collectionPath}/`),
    );

    reference.clauses.forEach((clause) => {
      if (clause.field === "__name__" && clause.op === "in") {
        const ids = new Set((clause.value as string[]) ?? []);
        entries = entries.filter(([path]) =>
          ids.has(path.split("/").at(-1) ?? ""),
        );
        return;
      }

      if (clause.op === "array-contains") {
        entries = entries.filter(([, value]) => {
          const relation = value[clause.field];
          return Array.isArray(relation) && relation.includes(clause.value);
        });
      }
    });

    return toSnapshot(entries);
  });

  return {
    firestoreState,
    counter,
    setDocMock,
    getDocMock,
    getDocsMock,
    deleteDocMock,
  };
});

vi.mock("firebase/firestore", () => {
  const collection = vi.fn(
    (_db: unknown, ...segments: string[]): CollectionRef => ({
      kind: "collection",
      path: segments.join("/"),
    }),
  );

  const doc = vi.fn(
    (ref: CollectionRef, id: string): DocRef => ({
      kind: "doc",
      path: `${ref.path}/${id}`,
      id,
    }),
  );

  const where = vi.fn(
    (
      field: string,
      op: "in" | "array-contains",
      value: unknown,
    ): WhereClause => ({
      field,
      op,
      value,
    }),
  );

  const query = vi.fn(
    (ref: CollectionRef, ...clauses: WhereClause[]): QueryRef => ({
      kind: "query",
      collectionPath: ref.path,
      clauses,
    }),
  );

  return {
    collection,
    doc,
    where,
    query,
    getDoc: hoisted.getDocMock,
    getDocs: hoisted.getDocsMock,
    setDoc: hoisted.setDocMock,
    deleteDoc: hoisted.deleteDocMock,
    documentId: () => "__name__",
  };
});

vi.mock("@/data/types", async () => {
  const actual =
    await vi.importActual<typeof import("@/data/types")>("@/data/types");

  return {
    ...actual,
    nowIsoDate: () => "2026-03-02T00:00:00.000Z",
    createEntityId: (prefix: string) => {
      hoisted.counter.value += 1;
      return `${prefix}_fire_${hoisted.counter.value}`;
    },
  };
});

vi.mock("@/data/shared/relation-mutation-runner", () => ({
  applyBidirectionalRelationMutations: vi.fn(async () => undefined),
  applyDetachRelationMutations: vi.fn(async () => undefined),
  applyInboundCleanupSpecs: vi.fn(async () => undefined),
}));

import { createFirestoreDataModules } from "@/data/firestore/firestore-data-modules";

describe("createFirestoreDataModules", () => {
  beforeEach(() => {
    hoisted.firestoreState.clear();
    hoisted.counter.value = 0;
    hoisted.setDocMock.mockClear();
    hoisted.getDocMock.mockClear();
    hoisted.getDocsMock.mockClear();
    hoisted.deleteDocMock.mockClear();
  });

  it("creates entity with normalized relation arrays and deterministic metadata", async () => {
    const modules = createFirestoreDataModules({} as never, "u1");

    const created = await modules.projects.create({
      name: "Proj",
      paraType: "project",
      description: "test",
      tags: [],
      personIds: ["p1", "p1", "p2"],
      companyIds: [],
      noteIds: [],
      taskIds: [],
      meetingIds: [],
    });

    expect(created.id).toBe("project_fire_1");
    expect(created.createdAt).toBe("2026-03-02T00:00:00.000Z");
    expect(created.updatedAt).toBe("2026-03-02T00:00:00.000Z");
    expect(created.personIds).toEqual(["p1", "p2"]);
    expect(hoisted.setDocMock).toHaveBeenCalledTimes(1);
  });

  it("chunks listByIds queries into groups of 10 unique ids", async () => {
    const modules = createFirestoreDataModules({} as never, "u1");
    const ids = Array.from({ length: 11 }, (_, index) => `person_${index + 1}`);

    ids.forEach((id) => {
      hoisted.firestoreState.set(`users/u1/people/${id}`, {
        id,
        firstName: "A",
        lastName: "B",
        tags: [],
        companyIds: [],
        projectIds: [],
        noteIds: [],
        taskIds: [],
        meetingIds: [],
        createdAt: "2026-03-02T00:00:00.000Z",
        updatedAt: "2026-03-02T00:00:00.000Z",
      });
    });

    const result = await modules.people.listByIds([...ids, ids[0]]);
    expect(result).toHaveLength(11);

    const inQueries = hoisted.getDocsMock.mock.calls
      .map((call) => call[0] as CollectionRef | QueryRef)
      .filter((reference): reference is QueryRef => reference.kind === "query")
      .map((reference) =>
        reference.clauses.find((clause) => clause.field === "__name__"),
      )
      .filter(Boolean) as WhereClause[];

    expect(inQueries).toHaveLength(2);
    expect((inQueries[0].value as string[]).length).toBe(10);
    expect((inQueries[1].value as string[]).length).toBe(1);
  });

  it("hydrates associated records from linked entity ids", async () => {
    const modules = createFirestoreDataModules({} as never, "u1");

    hoisted.firestoreState.set("users/u1/projects/project_1", {
      id: "project_1",
      name: "Proj",
      paraType: "project",
      tags: [],
      personIds: ["person_1"],
      companyIds: [],
      noteIds: [],
      taskIds: [],
      meetingIds: [],
      createdAt: "2026-03-02T00:00:00.000Z",
      updatedAt: "2026-03-02T00:00:00.000Z",
    });

    hoisted.firestoreState.set("users/u1/people/person_1", {
      id: "person_1",
      firstName: "Ada",
      lastName: "Lovelace",
      tags: [],
      companyIds: [],
      projectIds: ["project_1"],
      noteIds: [],
      taskIds: [],
      meetingIds: [],
      createdAt: "2026-03-02T00:00:00.000Z",
      updatedAt: "2026-03-02T00:00:00.000Z",
    });

    const associated = await modules.projects.getAssociatedRecords("project_1");
    expect(associated?.project.id).toBe("project_1");
    expect(associated?.people.map((item) => item.id)).toEqual(["person_1"]);
  });

  it("returns false when deleting unknown entity and true for existing entity", async () => {
    const modules = createFirestoreDataModules({} as never, "u1");

    await expect(modules.notes.delete("missing")).resolves.toBe(false);

    hoisted.firestoreState.set("users/u1/notes/n1", {
      id: "n1",
      title: "Note",
      body: "",
      tags: [],
      relatedNoteIds: [],
      personIds: [],
      companyIds: [],
      projectIds: [],
      taskIds: [],
      meetingIds: [],
      createdAt: "2026-03-02T00:00:00.000Z",
      updatedAt: "2026-03-02T00:00:00.000Z",
    });

    await expect(modules.notes.delete("n1")).resolves.toBe(true);
    expect(hoisted.deleteDocMock).toHaveBeenCalledTimes(1);
  });
});
