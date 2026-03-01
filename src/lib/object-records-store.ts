import { createEntityId, nowIsoDate, type IsoDateString } from "@/data/types";
import {
  type ObjectTypeDefinition,
  type ObjectTypeProperty,
} from "@/lib/object-types-store";

const OBJECT_RECORDS_STORAGE_KEY = "pkm.object-records.v1";

export type ObjectRecordValue = string | number;

export type ObjectRecord = {
  id: string;
  objectTypeId: string;
  values: Record<string, ObjectRecordValue>;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

function currentDateValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeObjectRecord(value: unknown): ObjectRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : null;
  const objectTypeId =
    typeof record.objectTypeId === "string" ? record.objectTypeId : null;

  if (!id || !objectTypeId) {
    return null;
  }

  const valuesInput =
    record.values && typeof record.values === "object"
      ? (record.values as Record<string, unknown>)
      : {};

  const values: Record<string, ObjectRecordValue> = {};
  Object.entries(valuesInput).forEach(([propertyId, propertyValue]) => {
    if (
      typeof propertyValue === "string" ||
      typeof propertyValue === "number"
    ) {
      values[propertyId] = propertyValue;
    }
  });

  const createdAt =
    typeof record.createdAt === "string" ? record.createdAt : nowIsoDate();
  const updatedAt =
    typeof record.updatedAt === "string" ? record.updatedAt : createdAt;

  return {
    id,
    objectTypeId,
    values,
    createdAt,
    updatedAt,
  };
}

function loadState(): ObjectRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(OBJECT_RECORDS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => normalizeObjectRecord(entry))
      .filter((entry): entry is ObjectRecord => Boolean(entry));
  } catch {
    return [];
  }
}

function persistState(records: ObjectRecord[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    OBJECT_RECORDS_STORAGE_KEY,
    JSON.stringify(records),
  );
}

function normalizeValueForProperty(
  property: ObjectTypeProperty,
  value: unknown,
): ObjectRecordValue {
  if (property.type === "number") {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) {
        return "";
      }

      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : "";
    }

    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function defaultValueForProperty(
  property: ObjectTypeProperty,
): ObjectRecordValue {
  if (property.type === "number") {
    return "";
  }

  if (property.type === "date" && property.autoSetCurrentDateOnCreate) {
    return currentDateValue();
  }

  if (property.type === "select") {
    return property.options?.[0] ?? "";
  }

  return "";
}

export function listObjectRecordsByType(objectTypeId: string): ObjectRecord[] {
  return loadState()
    .filter((record) => record.objectTypeId === objectTypeId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function createObjectRecord(
  objectType: ObjectTypeDefinition,
): ObjectRecord {
  const timestamp = nowIsoDate();
  const values = Object.fromEntries(
    objectType.properties.map((property) => [
      property.id,
      defaultValueForProperty(property),
    ]),
  );

  const next: ObjectRecord = {
    id: createEntityId("object_record"),
    objectTypeId: objectType.id,
    values,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const records = loadState();
  persistState([next, ...records]);
  return next;
}

export function updateObjectRecord(
  objectType: ObjectTypeDefinition,
  objectRecordId: string,
  inputValues: Partial<Record<string, unknown>>,
): ObjectRecord | null {
  const records = loadState();
  const index = records.findIndex((record) => record.id === objectRecordId);
  if (index < 0) {
    return null;
  }

  const existing = records[index];
  const normalizedInputValues: Record<string, ObjectRecordValue> = {};

  objectType.properties.forEach((property) => {
    if (!(property.id in inputValues)) {
      return;
    }

    normalizedInputValues[property.id] = normalizeValueForProperty(
      property,
      inputValues[property.id],
    );
  });

  const next: ObjectRecord = {
    ...existing,
    values: {
      ...existing.values,
      ...normalizedInputValues,
    },
    updatedAt: nowIsoDate(),
  };

  const nextRecords = [...records];
  nextRecords[index] = next;
  persistState(nextRecords);
  return next;
}

export function upsertObjectRecord(
  objectType: ObjectTypeDefinition,
  objectRecordId: string,
  inputValues: Partial<Record<string, unknown>>,
): ObjectRecord {
  const records = loadState();
  const index = records.findIndex((record) => record.id === objectRecordId);

  if (index >= 0) {
    const updated = updateObjectRecord(objectType, objectRecordId, inputValues);
    if (updated) {
      return updated;
    }
  }

  const timestamp = nowIsoDate();
  const defaultValues = Object.fromEntries(
    objectType.properties.map((property) => [
      property.id,
      defaultValueForProperty(property),
    ]),
  );

  const normalizedInputValues: Record<string, ObjectRecordValue> = {};
  objectType.properties.forEach((property) => {
    if (!(property.id in inputValues)) {
      return;
    }

    normalizedInputValues[property.id] = normalizeValueForProperty(
      property,
      inputValues[property.id],
    );
  });

  const next: ObjectRecord = {
    id: objectRecordId,
    objectTypeId: objectType.id,
    values: {
      ...defaultValues,
      ...normalizedInputValues,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  persistState([next, ...records]);
  return next;
}

export function deleteObjectRecord(objectRecordId: string): boolean {
  const records = loadState();
  const next = records.filter((record) => record.id !== objectRecordId);

  if (next.length === records.length) {
    return false;
  }

  persistState(next);
  return true;
}
