import type {
  EntityCollectionName,
  EntityId,
  RelationField,
} from "@/data/types";

export type RelationConfig = {
  targetCollection: EntityCollectionName;
  targetField: string;
};

export const RELATION_CONFIG: Record<
  EntityCollectionName,
  Partial<Record<string, RelationConfig>>
> = {
  projects: {
    personIds: { targetCollection: "people", targetField: "projectIds" },
    companyIds: { targetCollection: "companies", targetField: "projectIds" },
    noteIds: { targetCollection: "notes", targetField: "projectIds" },
    taskIds: { targetCollection: "tasks", targetField: "projectIds" },
    meetingIds: { targetCollection: "meetings", targetField: "projectIds" },
  },
  notes: {
    relatedNoteIds: {
      targetCollection: "notes",
      targetField: "relatedNoteIds",
    },
    personIds: { targetCollection: "people", targetField: "noteIds" },
    companyIds: { targetCollection: "companies", targetField: "noteIds" },
    projectIds: { targetCollection: "projects", targetField: "noteIds" },
    taskIds: { targetCollection: "tasks", targetField: "noteIds" },
    meetingIds: { targetCollection: "meetings", targetField: "noteIds" },
  },
  tasks: {
    personIds: { targetCollection: "people", targetField: "taskIds" },
    companyIds: { targetCollection: "companies", targetField: "taskIds" },
    projectIds: { targetCollection: "projects", targetField: "taskIds" },
    noteIds: { targetCollection: "notes", targetField: "taskIds" },
    meetingIds: { targetCollection: "meetings", targetField: "taskIds" },
  },
  meetings: {
    personIds: { targetCollection: "people", targetField: "meetingIds" },
    companyIds: { targetCollection: "companies", targetField: "meetingIds" },
    projectIds: { targetCollection: "projects", targetField: "meetingIds" },
    noteIds: { targetCollection: "notes", targetField: "meetingIds" },
    taskIds: { targetCollection: "tasks", targetField: "meetingIds" },
  },
  companies: {
    personIds: { targetCollection: "people", targetField: "companyIds" },
    projectIds: { targetCollection: "projects", targetField: "companyIds" },
    noteIds: { targetCollection: "notes", targetField: "companyIds" },
    taskIds: { targetCollection: "tasks", targetField: "companyIds" },
    meetingIds: { targetCollection: "meetings", targetField: "companyIds" },
  },
  people: {
    companyIds: { targetCollection: "companies", targetField: "personIds" },
    projectIds: { targetCollection: "projects", targetField: "personIds" },
    noteIds: { targetCollection: "notes", targetField: "personIds" },
    taskIds: { targetCollection: "tasks", targetField: "personIds" },
    meetingIds: { targetCollection: "meetings", targetField: "personIds" },
  },
};

export function uniqueEntityIds(values: EntityId[]): EntityId[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function relationFieldsFromDefaults<TEntity>(relationDefaults: {
  [K in RelationField<TEntity>]?: EntityId[];
}): string[] {
  return Object.keys(relationDefaults);
}

export function readRelationIds(entity: unknown, field: string): EntityId[] {
  if (!entity || typeof entity !== "object") {
    return [];
  }

  const record = entity as Record<string, unknown>;
  const value = record[field];
  return Array.isArray(value) ? (value as EntityId[]) : [];
}

export type PlannedRelationMutation = {
  config: RelationConfig;
  relatedId: EntityId;
  sourceId: EntityId;
};

export type InboundCleanupSpec = {
  sourceCollection: EntityCollectionName;
  sourceField: string;
};

export function planBidirectionalRelationMutations<
  TEntity extends { id: EntityId },
>(params: {
  collection: EntityCollectionName;
  relationFields: string[];
  nextEntity: TEntity;
  previousEntity: TEntity | null;
}): {
  additions: PlannedRelationMutation[];
  removals: PlannedRelationMutation[];
} {
  const collectionConfig = RELATION_CONFIG[params.collection];
  const additions: PlannedRelationMutation[] = [];
  const removals: PlannedRelationMutation[] = [];

  params.relationFields.forEach((field) => {
    const config = collectionConfig[field];
    if (!config) {
      return;
    }

    const previousIds = uniqueEntityIds(
      readRelationIds(params.previousEntity, field),
    );
    const nextIds = uniqueEntityIds(readRelationIds(params.nextEntity, field));

    const previousSet = new Set(previousIds);
    const nextSet = new Set(nextIds);

    previousIds
      .filter((id) => !nextSet.has(id))
      .forEach((relatedId) => {
        removals.push({
          config,
          relatedId,
          sourceId: params.nextEntity.id,
        });
      });

    nextIds
      .filter((id) => !previousSet.has(id))
      .forEach((relatedId) => {
        additions.push({
          config,
          relatedId,
          sourceId: params.nextEntity.id,
        });
      });
  });

  return { additions, removals };
}

export function planDetachRelationMutations<
  TEntity extends { id: EntityId },
>(params: {
  collection: EntityCollectionName;
  relationFields: string[];
  deletedEntity: TEntity;
}): PlannedRelationMutation[] {
  const collectionConfig = RELATION_CONFIG[params.collection];
  const removals: PlannedRelationMutation[] = [];

  params.relationFields.forEach((field) => {
    const config = collectionConfig[field];
    if (!config) {
      return;
    }

    uniqueEntityIds(readRelationIds(params.deletedEntity, field)).forEach(
      (relatedId) => {
        removals.push({
          config,
          relatedId,
          sourceId: params.deletedEntity.id,
        });
      },
    );
  });

  return removals;
}

export function planInboundCleanupSpecs(
  targetCollection: EntityCollectionName,
): InboundCleanupSpec[] {
  const specs: InboundCleanupSpec[] = [];

  (Object.keys(RELATION_CONFIG) as EntityCollectionName[]).forEach(
    (sourceCollection) => {
      const sourceConfig = RELATION_CONFIG[sourceCollection];

      Object.entries(sourceConfig).forEach(([sourceField, config]) => {
        if (!config || config.targetCollection !== targetCollection) {
          return;
        }

        specs.push({
          sourceCollection,
          sourceField,
        });
      });
    },
  );

  return specs;
}
