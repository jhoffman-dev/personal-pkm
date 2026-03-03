import { beforeEach, describe, expect, it, vi } from "vitest";

const entityIdByPrefix = new Map<string, number>();

vi.mock("@/data/types", async () => {
  const actual =
    await vi.importActual<typeof import("@/data/types")>("@/data/types");

  return {
    ...actual,
    createEntityId: (prefix: string) => {
      const next = (entityIdByPrefix.get(prefix) ?? 0) + 1;
      entityIdByPrefix.set(prefix, next);
      return `${prefix}_test_${next}`;
    },
  };
});

import {
  addObjectTypeProperty,
  createObjectType,
  deleteObjectType,
  deleteObjectTypeProperty,
  listObjectTypes,
  updateObjectType,
  updateObjectTypeProperty,
} from "@/lib/object-types-store";

class MemoryStorage {
  private readonly state = new Map<string, string>();

  getItem(key: string): string | null {
    return this.state.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.state.set(key, value);
  }

  clear(): void {
    this.state.clear();
  }
}

const OBJECT_TYPES_STORAGE_KEY = "pkm.object-types.v1";

describe("object-types-store", () => {
  const storage = new MemoryStorage();

  beforeEach(() => {
    storage.clear();
    entityIdByPrefix.clear();

    vi.stubGlobal("window", {
      localStorage: storage,
    });
  });

  it("merges system object types with stored custom types", () => {
    storage.setItem(
      OBJECT_TYPES_STORAGE_KEY,
      JSON.stringify([
        {
          id: "object_type_people",
          name: "Renamed",
          isSystem: false,
          properties: [],
        },
        {
          id: "object_type_custom",
          name: "Custom",
          isSystem: false,
          properties: [],
        },
      ]),
    );

    const objectTypes = listObjectTypes();
    const people = objectTypes.find((item) => item.id === "object_type_people");
    const custom = objectTypes.find((item) => item.id === "object_type_custom");

    expect(people?.name).toBe("People");
    expect(people?.isSystem).toBe(true);
    expect(custom?.name).toBe("Custom");
  });

  it("creates and updates object types with trimmed names", () => {
    const created = createObjectType("Temp Type");
    expect(created.id).toBe("object_type_test_1");

    const updated = updateObjectType(created.id, { name: "  Updated Type  " });
    expect(updated?.name).toBe("Updated Type");

    const persisted = listObjectTypes().find((item) => item.id === created.id);
    expect(persisted?.name).toBe("Updated Type");
  });

  it("normalizes select options and clears card image when property is deleted", () => {
    const created = createObjectType("Custom");
    const property = addObjectTypeProperty(created.id, "select");
    expect(property).not.toBeNull();

    const updatedProperty = updateObjectTypeProperty(created.id, property!.id, {
      options: ["One", " one ", "Two", "  ", "Two"],
    });
    expect(updatedProperty?.options).toEqual(["One", "one", "Two"]);

    updateObjectType(created.id, { cardImagePropertyId: property!.id });
    const deleted = deleteObjectTypeProperty(created.id, property!.id);

    expect(deleted).toBe(true);
    const persisted = listObjectTypes().find((item) => item.id === created.id);
    expect(persisted?.cardImagePropertyId).toBeUndefined();
  });

  it("does not allow deleting system object types", () => {
    expect(deleteObjectType("object_type_people")).toBe(false);
  });
});
