import {
  listObjectRecords,
  type ObjectRecord,
  type ObjectRecordValue,
} from "@/lib/object-records-store";
import type {
  ObjectTypeDefinition,
  ObjectTypeProperty,
} from "@/lib/object-types-store";
import {
  connectionIdsFromValue,
  getRecordTitle,
} from "@/pages/objects-page-formatting";

export type ResolvedConnectionTarget = {
  targetTypeId: string;
  targetType: ObjectTypeDefinition;
  targetRecord: ObjectRecord;
};

export function resolveConnectionTarget(params: {
  connectionId: string;
  hintedTypeId?: string;
  objectTypes: ObjectTypeDefinition[];
  getRecordsForType: (typeId: string) => ObjectRecord[];
}): ResolvedConnectionTarget | null {
  const tryResolveInType = (
    targetTypeId: string,
  ): ResolvedConnectionTarget | null => {
    const targetType = params.objectTypes.find(
      (item) => item.id === targetTypeId,
    );
    if (!targetType) {
      return null;
    }

    const targetRecord = params
      .getRecordsForType(targetTypeId)
      .find((entry) => entry.id === params.connectionId);

    if (!targetRecord) {
      return null;
    }

    return {
      targetTypeId,
      targetType,
      targetRecord,
    };
  };

  if (params.hintedTypeId) {
    const hintedMatch = tryResolveInType(params.hintedTypeId);
    if (hintedMatch) {
      return hintedMatch;
    }
  }

  for (const objectType of params.objectTypes) {
    if (objectType.id === params.hintedTypeId) {
      continue;
    }

    const match = tryResolveInType(objectType.id);
    if (match) {
      return match;
    }
  }

  const rawRecord = listObjectRecords().find(
    (entry) => entry.id === params.connectionId,
  );
  if (rawRecord) {
    const rawType = params.objectTypes.find(
      (item) => item.id === rawRecord.objectTypeId,
    );

    if (rawType) {
      return {
        targetTypeId: rawType.id,
        targetType: rawType,
        targetRecord: rawRecord,
      };
    }
  }

  return null;
}

export function resolveFallbackConnectionLabel(params: {
  connectionId: string;
  objectTypes: ObjectTypeDefinition[];
}): string | null {
  const rawRecord = listObjectRecords().find(
    (entry) => entry.id === params.connectionId,
  );
  if (!rawRecord) {
    return null;
  }

  const rawType = params.objectTypes.find(
    (item) => item.id === rawRecord.objectTypeId,
  );
  if (rawType) {
    return getRecordTitle(rawRecord, rawType);
  }

  const firstValue = Object.values(rawRecord.values).find((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (typeof value === "number") {
      return true;
    }

    if (typeof value === "string") {
      return value.trim().length > 0;
    }

    return false;
  });

  if (Array.isArray(firstValue)) {
    return firstValue.join(", ");
  }

  if (typeof firstValue === "number") {
    return String(firstValue);
  }

  if (typeof firstValue === "string") {
    const trimmed = firstValue.trim();
    return trimmed || null;
  }

  return null;
}

export function syncBidirectionalConnection(params: {
  selectedType: ObjectTypeDefinition | null;
  objectTypes: ObjectTypeDefinition[];
  sourceRecordId: string;
  property: ObjectTypeProperty;
  previousValue: ObjectRecordValue | undefined;
  nextValue: ObjectRecordValue | undefined;
  getRecordsForType: (typeId: string) => ObjectRecord[];
  updateField: (
    objectRecordId: string,
    property: ObjectTypeProperty,
    value: unknown,
  ) => void;
}): void {
  const {
    selectedType,
    objectTypes,
    sourceRecordId,
    property,
    previousValue,
    nextValue,
    getRecordsForType,
    updateField,
  } = params;

  if (
    !selectedType ||
    property.type !== "connection" ||
    !property.connectionIsBidirectional ||
    !property.connectionTypeId ||
    !property.connectionReciprocalPropertyId
  ) {
    return;
  }

  const targetType = objectTypes.find(
    (item) => item.id === property.connectionTypeId,
  );
  if (!targetType) {
    return;
  }

  const reciprocalProperty = targetType.properties.find(
    (item) =>
      item.id === property.connectionReciprocalPropertyId &&
      item.type === "connection",
  );
  if (!reciprocalProperty) {
    return;
  }

  const previousIds = connectionIdsFromValue(previousValue);
  const nextIds = connectionIdsFromValue(nextValue);

  const addedIds = nextIds.filter((id) => !previousIds.includes(id));
  const removedIds = previousIds.filter((id) => !nextIds.includes(id));

  const recordsById = new Map(
    getRecordsForType(targetType.id).map((record) => [record.id, record]),
  );

  const updateTargetReciprocal = (targetId: string, shouldInclude: boolean) => {
    const targetRecord = recordsById.get(targetId);
    if (!targetRecord) {
      return;
    }

    const currentIds = connectionIdsFromValue(
      targetRecord.values[reciprocalProperty.id],
    );

    const nextTargetIds = shouldInclude
      ? Array.from(new Set([...currentIds, sourceRecordId]))
      : currentIds.filter((id) => id !== sourceRecordId);

    const nextTargetValue: ObjectRecordValue =
      reciprocalProperty.connectionMultiplicity === "multiple"
        ? nextTargetIds
        : (nextTargetIds[0] ?? "");

    updateField(targetId, reciprocalProperty, nextTargetValue);
  };

  addedIds.forEach((targetId) => updateTargetReciprocal(targetId, true));
  removedIds.forEach((targetId) => updateTargetReciprocal(targetId, false));
}
