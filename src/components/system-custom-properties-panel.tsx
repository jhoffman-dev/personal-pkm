import { Input } from "@/components/ui/input";
import type {
  Company,
  Meeting,
  Note,
  Person,
  Project,
  Task,
} from "@/data/entities";
import {
  listObjectRecordsByType,
  upsertObjectRecord,
  type ObjectRecord,
  type ObjectRecordValue,
} from "@/lib/object-records-store";
import {
  listObjectTypes,
  type ObjectTypeDefinition,
  type ObjectTypeProperty,
} from "@/lib/object-types-store";
import { useAppSelector } from "@/store";
import { useMemo, useState } from "react";

const SYSTEM_MAPPED_PROPERTY_IDS: Record<string, Set<string>> = {
  object_type_people: new Set([
    "property_first_name",
    "property_last_name",
    "property_email",
    "property_phone",
    "property_address",
  ]),
  object_type_companies: new Set([
    "property_company_name",
    "property_email",
    "property_phone",
    "property_address",
  ]),
  object_type_projects: new Set(["property_project_name"]),
  object_type_notes: new Set(["property_note_title"]),
  object_type_tasks: new Set(["property_task_title"]),
  object_type_meetings: new Set(["property_meeting_title"]),
};

function defaultValueForProperty(
  property: ObjectTypeProperty,
): ObjectRecordValue {
  if (property.type === "number") {
    return "";
  }

  if (property.type === "date" && property.autoSetCurrentDateOnCreate) {
    return new Date().toISOString().slice(0, 10);
  }

  if (property.type === "select") {
    return property.options?.[0] ?? "";
  }

  if (property.type === "connection") {
    return property.connectionMultiplicity === "multiple" ? [] : "";
  }

  return "";
}

function formatValue(value: ObjectRecordValue | undefined): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return String(value);
}

function connectionIdsFromValue(
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

function getRecordTitle(
  record: ObjectRecord,
  objectType: ObjectTypeDefinition,
): string {
  const firstNamedProperty = objectType.properties.find(
    (property) => property.type !== "connection" && property.type !== "picture",
  );

  if (!firstNamedProperty) {
    return "Untitled Record";
  }

  const value = formatValue(record.values[firstNamedProperty.id]).trim();
  return value || "Untitled Record";
}

function getSystemRecordLabel(
  objectTypeId: string,
  entity: Person | Company | Project | Note | Task | Meeting,
): string {
  if (objectTypeId === "object_type_people") {
    const person = entity as Person;
    return `${person.firstName} ${person.lastName}`.trim() || "Untitled Person";
  }

  if (objectTypeId === "object_type_companies") {
    return (entity as Company).name || "Untitled Company";
  }

  if (objectTypeId === "object_type_projects") {
    return (entity as Project).name || "Untitled Project";
  }

  if (objectTypeId === "object_type_notes") {
    return (entity as Note).title || "Untitled Note";
  }

  if (objectTypeId === "object_type_tasks") {
    return (entity as Task).title || "Untitled Task";
  }

  if (objectTypeId === "object_type_meetings") {
    return (entity as Meeting).title || "Untitled Meeting";
  }

  return "Untitled Record";
}

export function SystemCustomPropertiesPanel({
  objectTypeId,
  recordId,
}: {
  objectTypeId: string;
  recordId: string | null;
}) {
  const peopleState = useAppSelector((state) => state.people);
  const companiesState = useAppSelector((state) => state.companies);
  const projectsState = useAppSelector((state) => state.projects);
  const notesState = useAppSelector((state) => state.notes);
  const tasksState = useAppSelector((state) => state.tasks);
  const meetingsState = useAppSelector((state) => state.meetings);

  const [draftValues, setDraftValues] = useState<Record<string, string>>({});

  const objectTypes = useMemo(() => listObjectTypes(), []);

  const objectType = useMemo(
    () => objectTypes.find((item) => item.id === objectTypeId) ?? null,
    [objectTypeId, objectTypes],
  );

  const customProperties = useMemo(() => {
    if (!objectType) {
      return [];
    }

    const mappedIds =
      SYSTEM_MAPPED_PROPERTY_IDS[objectTypeId] ?? new Set<string>();

    return objectType.properties.filter(
      (property) => !mappedIds.has(property.id),
    );
  }, [objectType, objectTypeId]);

  const overlayRecord = useMemo(() => {
    if (!recordId) {
      return null;
    }

    return (
      listObjectRecordsByType(objectTypeId).find(
        (record) => record.id === recordId,
      ) ?? null
    );
  }, [objectTypeId, recordId]);

  const valuesByPropertyId = useMemo(() => {
    if (!objectType) {
      return {} as Record<string, ObjectRecordValue>;
    }

    return Object.fromEntries(
      customProperties.map((property) => [
        property.id,
        overlayRecord?.values[property.id] ?? defaultValueForProperty(property),
      ]),
    ) as Record<string, ObjectRecordValue>;
  }, [customProperties, objectType, overlayRecord]);

  const getRecordsForType = (typeId: string): ObjectRecord[] => {
    const targetType = objectTypes.find((item) => item.id === typeId);
    if (!targetType) {
      return [];
    }

    if (typeId === "object_type_people") {
      return peopleState.ids
        .map((id) => peopleState.entities[id])
        .filter((entity): entity is Person => Boolean(entity))
        .map((entity) => ({
          id: entity.id,
          objectTypeId: typeId,
          values: {},
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
        }));
    }

    if (typeId === "object_type_companies") {
      return companiesState.ids
        .map((id) => companiesState.entities[id])
        .filter((entity): entity is Company => Boolean(entity))
        .map((entity) => ({
          id: entity.id,
          objectTypeId: typeId,
          values: {},
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
        }));
    }

    if (typeId === "object_type_projects") {
      return projectsState.ids
        .map((id) => projectsState.entities[id])
        .filter((entity): entity is Project => Boolean(entity))
        .map((entity) => ({
          id: entity.id,
          objectTypeId: typeId,
          values: {},
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
        }));
    }

    if (typeId === "object_type_notes") {
      return notesState.ids
        .map((id) => notesState.entities[id])
        .filter((entity): entity is Note => Boolean(entity))
        .map((entity) => ({
          id: entity.id,
          objectTypeId: typeId,
          values: {},
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
        }));
    }

    if (typeId === "object_type_tasks") {
      return tasksState.ids
        .map((id) => tasksState.entities[id])
        .filter((entity): entity is Task => Boolean(entity))
        .map((entity) => ({
          id: entity.id,
          objectTypeId: typeId,
          values: {},
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
        }));
    }

    if (typeId === "object_type_meetings") {
      return meetingsState.ids
        .map((id) => meetingsState.entities[id])
        .filter((entity): entity is Meeting => Boolean(entity))
        .map((entity) => ({
          id: entity.id,
          objectTypeId: typeId,
          values: {},
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
        }));
    }

    return listObjectRecordsByType(typeId);
  };

  const commitValue = (property: ObjectTypeProperty, nextValue: unknown) => {
    if (!objectType || !recordId) {
      return;
    }

    upsertObjectRecord(objectType, recordId, {
      [property.id]: nextValue,
    });
  };

  const renderPropertyInput = (property: ObjectTypeProperty) => {
    const currentValue = valuesByPropertyId[property.id];
    const draftValue = draftValues[property.id] ?? formatValue(currentValue);

    if (property.type === "select") {
      return (
        <select
          value={draftValue}
          onChange={(event) => {
            const nextValue = event.target.value;
            setDraftValues((previous) => ({
              ...previous,
              [property.id]: nextValue,
            }));
            commitValue(property, nextValue);
          }}
          className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
        >
          <option value="">Select option</option>
          {(property.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (property.type === "connection") {
      const targetType = property.connectionTypeId
        ? objectTypes.find((item) => item.id === property.connectionTypeId)
        : null;
      const records = property.connectionTypeId
        ? getRecordsForType(property.connectionTypeId)
        : [];
      const selectedIds = connectionIdsFromValue(currentValue);

      if (property.connectionMultiplicity === "multiple") {
        return (
          <select
            multiple
            value={selectedIds}
            onChange={(event) => {
              const nextIds = Array.from(event.target.selectedOptions).map(
                (option) => option.value,
              );
              setDraftValues((previous) => ({
                ...previous,
                [property.id]: nextIds.join(","),
              }));
              commitValue(property, nextIds);
            }}
            className="border-input bg-background min-h-24 w-full rounded-md border px-2 py-2 text-sm"
          >
            {records.map((record) => {
              const label =
                targetType?.isSystem && property.connectionTypeId
                  ? getSystemRecordLabel(
                      property.connectionTypeId,
                      (property.connectionTypeId === "object_type_people"
                        ? peopleState.entities[record.id]
                        : property.connectionTypeId === "object_type_companies"
                          ? companiesState.entities[record.id]
                          : property.connectionTypeId === "object_type_projects"
                            ? projectsState.entities[record.id]
                            : property.connectionTypeId === "object_type_notes"
                              ? notesState.entities[record.id]
                              : property.connectionTypeId ===
                                  "object_type_tasks"
                                ? tasksState.entities[record.id]
                                : meetingsState.entities[record.id]) as
                        | Person
                        | Company
                        | Project
                        | Note
                        | Task
                        | Meeting,
                    )
                  : targetType
                    ? getRecordTitle(record, targetType)
                    : record.id;

              return (
                <option key={record.id} value={record.id}>
                  {label}
                </option>
              );
            })}
          </select>
        );
      }

      return (
        <select
          value={draftValue}
          onChange={(event) => {
            const nextValue = event.target.value;
            setDraftValues((previous) => ({
              ...previous,
              [property.id]: nextValue,
            }));
            commitValue(property, nextValue);
          }}
          className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
        >
          <option value="">
            {targetType
              ? `Select ${targetType.name} record`
              : "Select target object type first"}
          </option>
          {records.map((record) => {
            const label =
              targetType?.isSystem && property.connectionTypeId
                ? getSystemRecordLabel(
                    property.connectionTypeId,
                    (property.connectionTypeId === "object_type_people"
                      ? peopleState.entities[record.id]
                      : property.connectionTypeId === "object_type_companies"
                        ? companiesState.entities[record.id]
                        : property.connectionTypeId === "object_type_projects"
                          ? projectsState.entities[record.id]
                          : property.connectionTypeId === "object_type_notes"
                            ? notesState.entities[record.id]
                            : property.connectionTypeId === "object_type_tasks"
                              ? tasksState.entities[record.id]
                              : meetingsState.entities[record.id]) as
                      | Person
                      | Company
                      | Project
                      | Note
                      | Task
                      | Meeting,
                  )
                : targetType
                  ? getRecordTitle(record, targetType)
                  : record.id;

            return (
              <option key={record.id} value={record.id}>
                {label}
              </option>
            );
          })}
        </select>
      );
    }

    const inputType =
      property.type === "email"
        ? "email"
        : property.type === "phone"
          ? "tel"
          : property.type === "number"
            ? "number"
            : property.type === "date"
              ? "date"
              : "text";

    return (
      <Input
        value={draftValue}
        type={inputType}
        onChange={(event) => {
          const nextValue = event.target.value;
          setDraftValues((previous) => ({
            ...previous,
            [property.id]: nextValue,
          }));
        }}
        onBlur={(event) => {
          commitValue(property, event.target.value);
        }}
        placeholder={property.name}
      />
    );
  };

  if (!recordId || !objectType || customProperties.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <h4 className="text-sm font-semibold">Custom Properties</h4>

      <div className="space-y-3">
        {customProperties.map((property) => (
          <div key={property.id} className="space-y-1">
            <label className="text-xs font-medium">
              {property.name}
              {property.isRequired ? " *" : ""}
            </label>
            {renderPropertyInput(property)}
          </div>
        ))}
      </div>
    </div>
  );
}
