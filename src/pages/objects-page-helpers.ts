import type {
  ObjectTypeDefinition,
  ObjectTypeProperty,
} from "@/lib/object-types-store";
import type { ObjectRecordValue } from "@/lib/object-records-store";

export type ObjectsViewMode = "table" | "list" | "cards" | "detail";

const OBJECT_VIEW_PREFERENCES_KEY = "pkm.object-view-preferences.v1";
const PEOPLE_OBJECT_TYPE_ID = "object_type_people";
const COMPANIES_OBJECT_TYPE_ID = "object_type_companies";
const PROJECTS_OBJECT_TYPE_ID = "object_type_projects";
const NOTES_OBJECT_TYPE_ID = "object_type_notes";
const TASKS_OBJECT_TYPE_ID = "object_type_tasks";
const MEETINGS_OBJECT_TYPE_ID = "object_type_meetings";

export type SystemEntityCollection =
  | "people"
  | "companies"
  | "projects"
  | "notes"
  | "tasks"
  | "meetings";

export function getSystemCollectionForObjectType(
  objectTypeId: string | null,
): SystemEntityCollection | null {
  if (objectTypeId === PEOPLE_OBJECT_TYPE_ID) {
    return "people";
  }

  if (objectTypeId === COMPANIES_OBJECT_TYPE_ID) {
    return "companies";
  }

  if (objectTypeId === PROJECTS_OBJECT_TYPE_ID) {
    return "projects";
  }

  if (objectTypeId === NOTES_OBJECT_TYPE_ID) {
    return "notes";
  }

  if (objectTypeId === TASKS_OBJECT_TYPE_ID) {
    return "tasks";
  }

  if (objectTypeId === MEETINGS_OBJECT_TYPE_ID) {
    return "meetings";
  }

  return null;
}

export function mappedSystemFieldKey(
  objectType: ObjectTypeDefinition,
  property: ObjectTypeProperty,
):
  | "firstName"
  | "lastName"
  | "name"
  | "email"
  | "phone"
  | "address"
  | "photoUrl"
  | "title"
  | null {
  const preferredPictureProperty =
    objectType.cardImagePropertyId &&
    objectType.properties.some(
      (item) =>
        item.id === objectType.cardImagePropertyId && item.type === "picture",
    )
      ? objectType.cardImagePropertyId
      : objectType.properties.find((item) => item.type === "picture")?.id;

  if (
    property.type === "picture" &&
    preferredPictureProperty &&
    property.id === preferredPictureProperty
  ) {
    return "photoUrl";
  }

  const objectTypeId = objectType.id;

  if (objectTypeId === PEOPLE_OBJECT_TYPE_ID) {
    if (property.id === "property_first_name") {
      return "firstName";
    }

    if (property.id === "property_last_name") {
      return "lastName";
    }

    if (property.id === "property_email") {
      return "email";
    }

    if (property.id === "property_phone") {
      return "phone";
    }

    if (property.id === "property_address") {
      return "address";
    }
  }

  if (objectTypeId === COMPANIES_OBJECT_TYPE_ID) {
    if (property.id === "property_company_name") {
      return "name";
    }

    if (property.id === "property_email") {
      return "email";
    }

    if (property.id === "property_phone") {
      return "phone";
    }

    if (property.id === "property_address") {
      return "address";
    }
  }

  if (objectTypeId === PROJECTS_OBJECT_TYPE_ID) {
    if (property.id === "property_project_name") {
      return "name";
    }
  }

  if (objectTypeId === NOTES_OBJECT_TYPE_ID) {
    if (property.id === "property_note_title") {
      return "title";
    }
  }

  if (objectTypeId === TASKS_OBJECT_TYPE_ID) {
    if (property.id === "property_task_title") {
      return "title";
    }
  }

  if (objectTypeId === MEETINGS_OBJECT_TYPE_ID) {
    if (property.id === "property_meeting_title") {
      return "title";
    }
  }

  return null;
}

export function defaultValueForProperty(
  property: ObjectTypeProperty,
): ObjectRecordValue {
  if (property.type === "date" && property.autoSetCurrentDateOnCreate) {
    return new Date().toISOString().slice(0, 10);
  }

  if (property.type === "select") {
    return property.options?.[0] ?? "";
  }

  return "";
}

export function loadObjectViewPreferences(): Record<string, ObjectsViewMode> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(OBJECT_VIEW_PREFERENCES_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const entries = Object.entries(parsed as Record<string, unknown>).filter(
      ([, value]) =>
        value === "table" ||
        value === "list" ||
        value === "cards" ||
        value === "detail",
    ) as Array<[string, ObjectsViewMode]>;

    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

export function saveObjectViewPreferences(
  preferences: Record<string, ObjectsViewMode>,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    OBJECT_VIEW_PREFERENCES_KEY,
    JSON.stringify(preferences),
  );
}
