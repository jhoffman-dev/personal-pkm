import { createEntityId } from "@/data/types";
import { SYSTEM_OBJECT_TYPES } from "@/lib/object-types-store-defaults";
import {
  listStoredObjectTypes,
  persistObjectTypes,
} from "@/lib/object-types-store-storage";
export type {
  ObjectPropertyType,
  ObjectTypeDefinition,
  ObjectTypeProperty,
} from "@/lib/object-types-store-model";
import type {
  ObjectPropertyType,
  ObjectTypeDefinition,
  ObjectTypeProperty,
} from "@/lib/object-types-store-model";

export function listObjectTypes(): ObjectTypeDefinition[] {
  return listStoredObjectTypes();
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
