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
  type ObjectRecord,
  type ObjectRecordValue,
} from "@/lib/object-records-store";
import type { ObjectTypeDefinition } from "@/lib/object-types-store";
import {
  defaultValueForProperty,
  getSystemCollectionForObjectType,
  mappedSystemFieldKey,
} from "@/pages/objects-page-helpers";

type EntityState<TEntity extends { id: string }> = {
  ids: string[];
  entities: Record<string, TEntity | undefined>;
};

type RecordsBuildInput = {
  typeId: string;
  objectTypes: ObjectTypeDefinition[];
  peopleState: EntityState<Person>;
  companiesState: EntityState<Company>;
  projectsState: EntityState<Project>;
  notesState: EntityState<Note>;
  tasksState: EntityState<Task>;
  meetingsState: EntityState<Meeting>;
};

export function buildRecordsForType(input: RecordsBuildInput): ObjectRecord[] {
  const targetType = input.objectTypes.find((item) => item.id === input.typeId);
  if (!targetType) {
    return [];
  }

  const systemCollection = getSystemCollectionForObjectType(input.typeId);
  if (!systemCollection) {
    return listObjectRecordsByType(input.typeId);
  }

  const overlayById = new Map(
    listObjectRecordsByType(input.typeId).map((record) => [record.id, record]),
  );

  const entities =
    systemCollection === "people"
      ? input.peopleState.ids
          .map((id) => input.peopleState.entities[id])
          .filter((entity): entity is Person => Boolean(entity))
      : systemCollection === "companies"
        ? input.companiesState.ids
            .map((id) => input.companiesState.entities[id])
            .filter((entity): entity is Company => Boolean(entity))
        : systemCollection === "projects"
          ? input.projectsState.ids
              .map((id) => input.projectsState.entities[id])
              .filter((entity): entity is Project => Boolean(entity))
          : systemCollection === "notes"
            ? input.notesState.ids
                .map((id) => input.notesState.entities[id])
                .filter((entity): entity is Note => Boolean(entity))
            : systemCollection === "tasks"
              ? input.tasksState.ids
                  .map((id) => input.tasksState.entities[id])
                  .filter((entity): entity is Task => Boolean(entity))
              : input.meetingsState.ids
                  .map((id) => input.meetingsState.entities[id])
                  .filter((entity): entity is Meeting => Boolean(entity));

  return entities
    .map((entity) => {
      const overlay = overlayById.get(entity.id);
      const values = Object.fromEntries(
        targetType.properties.map((property) => {
          const mappedKey = mappedSystemFieldKey(targetType, property);
          const mappedValue = mappedKey
            ? ((entity as unknown as Record<string, unknown>)[
                mappedKey
              ] as unknown)
            : undefined;

          const value =
            mappedValue !== undefined && mappedValue !== null
              ? (String(mappedValue) as ObjectRecordValue)
              : (overlay?.values[property.id] ??
                defaultValueForProperty(property));

          return [property.id, value];
        }),
      );

      return {
        id: entity.id,
        objectTypeId: input.typeId,
        values,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      } satisfies ObjectRecord;
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
