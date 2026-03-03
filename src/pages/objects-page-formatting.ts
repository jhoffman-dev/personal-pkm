import type {
  ObjectRecord,
  ObjectRecordValue,
} from "@/lib/object-records-store";
import type { ObjectTypeDefinition } from "@/lib/object-types-store";

export function formatRecordValue(
  value: ObjectRecordValue | undefined,
): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return String(value);
}

export function connectionIdsFromValue(
  value: ObjectRecordValue | undefined,
): string[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    if (trimmed.includes(",")) {
      return Array.from(
        new Set(
          trimmed
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean),
        ),
      );
    }

    return [trimmed];
  }

  return [];
}

export function getRecordTitle(
  record: ObjectRecord,
  objectType: ObjectTypeDefinition,
): string {
  const firstNamedProperty = objectType.properties.find(
    (property) => property.type !== "connection" && property.type !== "picture",
  );

  if (!firstNamedProperty) {
    return "Untitled Record";
  }

  const value = record.values[firstNamedProperty.id];
  const label = formatRecordValue(value).trim();
  return label || "Untitled Record";
}
