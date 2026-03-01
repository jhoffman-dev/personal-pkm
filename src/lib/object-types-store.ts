import { createEntityId } from "@/data/types";

const OBJECT_TYPES_STORAGE_KEY = "pkm.object-types.v1";

export type ObjectPropertyType =
  | "text"
  | "email"
  | "phone"
  | "address"
  | "number"
  | "date"
  | "picture"
  | "select"
  | "connection";

export type ObjectTypeProperty = {
  id: string;
  name: string;
  type: ObjectPropertyType;
  isRequired: boolean;
  autoSetCurrentDateOnCreate?: boolean;
  options?: string[];
  connectionTypeId?: string;
  connectionMultiplicity?: "single" | "multiple";
  connectionIsBidirectional?: boolean;
  connectionReciprocalPropertyId?: string;
};

export type ObjectTypeDefinition = {
  id: string;
  name: string;
  isSystem: boolean;
  cardImagePropertyId?: string;
  properties: ObjectTypeProperty[];
};

const SYSTEM_OBJECT_TYPES: ObjectTypeDefinition[] = [
  {
    id: "object_type_people",
    name: "People",
    isSystem: true,
    properties: [
      {
        id: "property_first_name",
        name: "First Name",
        type: "text",
        isRequired: true,
      },
      {
        id: "property_last_name",
        name: "Last Name",
        type: "text",
        isRequired: true,
      },
      {
        id: "property_email",
        name: "Email",
        type: "email",
        isRequired: false,
      },
      {
        id: "property_phone",
        name: "Phone",
        type: "phone",
        isRequired: false,
      },
      {
        id: "property_address",
        name: "Address",
        type: "address",
        isRequired: false,
      },
    ],
  },
  {
    id: "object_type_companies",
    name: "Companies",
    isSystem: true,
    properties: [
      {
        id: "property_company_name",
        name: "Company Name",
        type: "text",
        isRequired: true,
      },
      {
        id: "property_email",
        name: "Email",
        type: "email",
        isRequired: false,
      },
      {
        id: "property_phone",
        name: "Phone",
        type: "phone",
        isRequired: false,
      },
      {
        id: "property_address",
        name: "Address",
        type: "address",
        isRequired: false,
      },
    ],
  },
  {
    id: "object_type_projects",
    name: "Projects",
    isSystem: true,
    properties: [
      {
        id: "property_project_name",
        name: "Project Name",
        type: "text",
        isRequired: true,
      },
    ],
  },
  {
    id: "object_type_notes",
    name: "Notes",
    isSystem: true,
    properties: [
      {
        id: "property_note_title",
        name: "Title",
        type: "text",
        isRequired: true,
      },
    ],
  },
  {
    id: "object_type_tasks",
    name: "Tasks",
    isSystem: true,
    properties: [
      {
        id: "property_task_title",
        name: "Task Title",
        type: "text",
        isRequired: true,
      },
    ],
  },
  {
    id: "object_type_meetings",
    name: "Meetings",
    isSystem: true,
    properties: [
      {
        id: "property_meeting_title",
        name: "Meeting Title",
        type: "text",
        isRequired: true,
      },
    ],
  },
];

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

function persistObjectTypes(objectTypes: ObjectTypeDefinition[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    OBJECT_TYPES_STORAGE_KEY,
    JSON.stringify(objectTypes),
  );
}

export function listObjectTypes(): ObjectTypeDefinition[] {
  return mergeSystemObjectTypes(loadStoredObjectTypes());
}

export function createObjectType(
  name = "New Object Type",
): ObjectTypeDefinition {
  const next: ObjectTypeDefinition = {
    id: createEntityId("object_type"),
    name,
    isSystem: false,
    properties: [],
  };

  const objectTypes = listObjectTypes();
  persistObjectTypes([...objectTypes, next]);
  return next;
}

export function updateObjectType(
  objectTypeId: string,
  input: Partial<Pick<ObjectTypeDefinition, "name" | "cardImagePropertyId">>,
): ObjectTypeDefinition | null {
  const objectTypes = listObjectTypes();
  const index = objectTypes.findIndex((item) => item.id === objectTypeId);
  if (index < 0) {
    return null;
  }

  const existing = objectTypes[index];
  const next: ObjectTypeDefinition = {
    ...existing,
    name: input.name?.trim() ? input.name.trim() : existing.name,
    cardImagePropertyId:
      input.cardImagePropertyId !== undefined
        ? input.cardImagePropertyId || undefined
        : existing.cardImagePropertyId,
  };

  const nextObjectTypes = [...objectTypes];
  nextObjectTypes[index] = next;
  persistObjectTypes(nextObjectTypes);
  return next;
}

export function deleteObjectType(objectTypeId: string): boolean {
  const objectTypes = listObjectTypes();
  const target = objectTypes.find((item) => item.id === objectTypeId);
  if (!target || target.isSystem) {
    return false;
  }

  const next = objectTypes.filter((item) => item.id !== objectTypeId);
  persistObjectTypes(next);
  return true;
}

export function addObjectTypeProperty(
  objectTypeId: string,
  propertyType: ObjectPropertyType,
): ObjectTypeProperty | null {
  const objectTypes = listObjectTypes();
  const index = objectTypes.findIndex((item) => item.id === objectTypeId);
  if (index < 0) {
    return null;
  }

  const nextProperty: ObjectTypeProperty = {
    id: createEntityId("property"),
    name: "New Property",
    type: propertyType,
    isRequired: false,
    autoSetCurrentDateOnCreate: propertyType === "date" ? false : undefined,
    options: propertyType === "select" ? ["Option 1"] : undefined,
    connectionTypeId:
      propertyType === "connection" ? SYSTEM_OBJECT_TYPES[0]?.id : undefined,
    connectionMultiplicity:
      propertyType === "connection" ? "single" : undefined,
    connectionIsBidirectional:
      propertyType === "connection" ? false : undefined,
    connectionReciprocalPropertyId:
      propertyType === "connection" ? undefined : undefined,
  };

  const existing = objectTypes[index];
  const next: ObjectTypeDefinition = {
    ...existing,
    properties: [...existing.properties, nextProperty],
  };

  const nextObjectTypes = [...objectTypes];
  nextObjectTypes[index] = next;
  persistObjectTypes(nextObjectTypes);
  return nextProperty;
}

export function updateObjectTypeProperty(
  objectTypeId: string,
  propertyId: string,
  input: Partial<
    Pick<
      ObjectTypeProperty,
      | "name"
      | "isRequired"
      | "options"
      | "connectionTypeId"
      | "autoSetCurrentDateOnCreate"
      | "connectionMultiplicity"
      | "connectionIsBidirectional"
      | "connectionReciprocalPropertyId"
    >
  >,
): ObjectTypeProperty | null {
  const objectTypes = listObjectTypes();
  const objectTypeIndex = objectTypes.findIndex(
    (item) => item.id === objectTypeId,
  );
  if (objectTypeIndex < 0) {
    return null;
  }

  const objectType = objectTypes[objectTypeIndex];
  const propertyIndex = objectType.properties.findIndex(
    (property) => property.id === propertyId,
  );
  if (propertyIndex < 0) {
    return null;
  }

  const existing = objectType.properties[propertyIndex];
  const next: ObjectTypeProperty = {
    ...existing,
    name: input.name !== undefined ? input.name : existing.name,
    isRequired:
      input.isRequired !== undefined ? input.isRequired : existing.isRequired,
    autoSetCurrentDateOnCreate:
      existing.type === "date"
        ? (input.autoSetCurrentDateOnCreate ??
          existing.autoSetCurrentDateOnCreate ??
          false)
        : undefined,
    options:
      existing.type === "select"
        ? Array.from(
            new Set(
              (input.options ?? existing.options ?? [])
                .map((option) => option.trim())
                .filter(Boolean),
            ),
          )
        : undefined,
    connectionTypeId:
      existing.type === "connection"
        ? (input.connectionTypeId ?? existing.connectionTypeId)
        : undefined,
    connectionMultiplicity:
      existing.type === "connection"
        ? (input.connectionMultiplicity ??
          existing.connectionMultiplicity ??
          "single")
        : undefined,
    connectionIsBidirectional:
      existing.type === "connection"
        ? (input.connectionIsBidirectional ??
          existing.connectionIsBidirectional ??
          false)
        : undefined,
    connectionReciprocalPropertyId:
      existing.type === "connection"
        ? (input.connectionReciprocalPropertyId ??
          existing.connectionReciprocalPropertyId)
        : undefined,
  };

  const nextProperties = [...objectType.properties];
  nextProperties[propertyIndex] = next;

  const nextObjectType: ObjectTypeDefinition = {
    ...objectType,
    properties: nextProperties,
  };

  const nextObjectTypes = [...objectTypes];
  nextObjectTypes[objectTypeIndex] = nextObjectType;
  persistObjectTypes(nextObjectTypes);
  return next;
}

export function deleteObjectTypeProperty(
  objectTypeId: string,
  propertyId: string,
): boolean {
  const objectTypes = listObjectTypes();
  const objectTypeIndex = objectTypes.findIndex(
    (item) => item.id === objectTypeId,
  );
  if (objectTypeIndex < 0) {
    return false;
  }

  const objectType = objectTypes[objectTypeIndex];
  const nextProperties = objectType.properties.filter(
    (property) => property.id !== propertyId,
  );

  if (nextProperties.length === objectType.properties.length) {
    return false;
  }

  const nextObjectTypes = [...objectTypes];
  nextObjectTypes[objectTypeIndex] = {
    ...objectType,
    cardImagePropertyId:
      objectType.cardImagePropertyId === propertyId
        ? undefined
        : objectType.cardImagePropertyId,
    properties: nextProperties,
  };
  persistObjectTypes(nextObjectTypes);
  return true;
}
