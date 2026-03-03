import {
  OBJECT_TYPES_STORAGE_KEY,
  type ObjectTypeDefinition,
  type ObjectTypeProperty,
} from "@/lib/object-types-store-model";
import { SYSTEM_OBJECT_TYPES } from "@/lib/object-types-store-defaults";

function normalizeProperty(value: unknown): ObjectTypeProperty | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : null;
  const name = typeof record.name === "string" ? record.name : null;
  const type =
    record.type === "text" ||
    record.type === "email" ||
    record.type === "phone" ||
    record.type === "address" ||
    record.type === "number" ||
    record.type === "date" ||
    record.type === "picture" ||
    record.type === "select" ||
    record.type === "connection"
      ? record.type
      : null;

  if (!id || !name || !type) {
    return null;
  }

  const options = Array.isArray(record.options)
    ? record.options.filter(
        (option): option is string => typeof option === "string",
      )
    : undefined;

  const legacyConnectionTypeId =
    typeof record.relationTypeId === "string"
      ? record.relationTypeId
      : typeof record.targetObjectTypeId === "string"
        ? record.targetObjectTypeId
        : undefined;
  const legacyConnectionMultiplicity =
    record.relationMultiplicity === "multiple"
      ? "multiple"
      : typeof record.allowMultiple === "boolean"
        ? record.allowMultiple
          ? "multiple"
          : "single"
        : undefined;
  const legacyConnectionIsBidirectional =
    typeof record.relationIsBidirectional === "boolean"
      ? record.relationIsBidirectional
      : typeof record.isBidirectional === "boolean"
        ? record.isBidirectional
        : undefined;
  const legacyConnectionReciprocalPropertyId =
    typeof record.relationReciprocalPropertyId === "string"
      ? record.relationReciprocalPropertyId
      : typeof record.reciprocalConnectionPropertyId === "string"
        ? record.reciprocalConnectionPropertyId
        : undefined;

  return {
    id,
    name,
    type,
    isRequired: Boolean(record.isRequired),
    autoSetCurrentDateOnCreate:
      type === "date" ? Boolean(record.autoSetCurrentDateOnCreate) : undefined,
    options:
      type === "select"
        ? Array.from(
            new Set(
              (options ?? []).map((option) => option.trim()).filter(Boolean),
            ),
          )
        : undefined,
    connectionTypeId:
      type === "connection"
        ? typeof record.connectionTypeId === "string"
          ? record.connectionTypeId
          : legacyConnectionTypeId
        : undefined,
    connectionMultiplicity:
      type === "connection"
        ? record.connectionMultiplicity === "multiple"
          ? "multiple"
          : record.connectionMultiplicity === "single"
            ? "single"
            : (legacyConnectionMultiplicity ?? "single")
        : undefined,
    connectionIsBidirectional:
      type === "connection"
        ? typeof record.connectionIsBidirectional === "boolean"
          ? record.connectionIsBidirectional
          : (legacyConnectionIsBidirectional ?? false)
        : undefined,
    connectionReciprocalPropertyId:
      type === "connection"
        ? typeof record.connectionReciprocalPropertyId === "string"
          ? record.connectionReciprocalPropertyId
          : legacyConnectionReciprocalPropertyId
        : undefined,
  };
}

function normalizeObjectType(value: unknown): ObjectTypeDefinition | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : null;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const properties = Array.isArray(record.properties)
    ? record.properties
        .map((property) => normalizeProperty(property))
        .filter((property): property is ObjectTypeProperty => Boolean(property))
    : [];

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    isSystem: Boolean(record.isSystem),
    cardImagePropertyId:
      typeof record.cardImagePropertyId === "string"
        ? record.cardImagePropertyId
        : undefined,
    properties,
  };
}

function loadStoredObjectTypes(): ObjectTypeDefinition[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(OBJECT_TYPES_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((value) => normalizeObjectType(value))
      .filter((value): value is ObjectTypeDefinition => Boolean(value));
  } catch {
    return [];
  }
}

function mergeSystemObjectTypes(
  stored: ObjectTypeDefinition[],
): ObjectTypeDefinition[] {
  const byId = new Map(stored.map((item) => [item.id, item]));
  const customTypes = stored.filter(
    (item) =>
      !SYSTEM_OBJECT_TYPES.some((systemType) => systemType.id === item.id),
  );

  const systemTypes = SYSTEM_OBJECT_TYPES.map((systemType) => {
    const existing = byId.get(systemType.id);

    if (!existing) {
      return systemType;
    }

    return {
      ...existing,
      id: systemType.id,
      name: systemType.name,
      isSystem: true,
    };
  });

  return [...systemTypes, ...customTypes];
}

export function listStoredObjectTypes(): ObjectTypeDefinition[] {
  return mergeSystemObjectTypes(loadStoredObjectTypes());
}

export function persistObjectTypes(objectTypes: ObjectTypeDefinition[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    OBJECT_TYPES_STORAGE_KEY,
    JSON.stringify(objectTypes),
  );
}
