import {
  planBidirectionalRelationMutations,
  planDetachRelationMutations,
  planInboundCleanupSpecs,
  type InboundCleanupSpec,
  type PlannedRelationMutation,
} from "@/data/shared/relation-domain";
import type { EntityCollectionName, EntityId } from "@/data/types";

type MaybePromise<T> = T | Promise<T>;

export async function applyBidirectionalRelationMutations<
  TEntity extends { id: EntityId },
>(params: {
  collection: EntityCollectionName;
  relationFields: string[];
  nextEntity: TEntity;
  previousEntity: TEntity | null;
  onAdd: (mutation: PlannedRelationMutation) => MaybePromise<void>;
  onRemove: (mutation: PlannedRelationMutation) => MaybePromise<void>;
}): Promise<void> {
  const { additions, removals } = planBidirectionalRelationMutations({
    collection: params.collection,
    relationFields: params.relationFields,
    nextEntity: params.nextEntity,
    previousEntity: params.previousEntity,
  });

  await Promise.all(additions.map((mutation) => params.onAdd(mutation)));
  await Promise.all(removals.map((mutation) => params.onRemove(mutation)));
}

export async function applyDetachRelationMutations<
  TEntity extends { id: EntityId },
>(params: {
  collection: EntityCollectionName;
  relationFields: string[];
  deletedEntity: TEntity;
  onRemove: (mutation: PlannedRelationMutation) => MaybePromise<void>;
}): Promise<void> {
  const removals = planDetachRelationMutations({
    collection: params.collection,
    relationFields: params.relationFields,
    deletedEntity: params.deletedEntity,
  });

  await Promise.all(removals.map((mutation) => params.onRemove(mutation)));
}

export async function applyInboundCleanupSpecs(params: {
  targetCollection: EntityCollectionName;
  onSpec: (spec: InboundCleanupSpec) => MaybePromise<void>;
}): Promise<void> {
  const specs = planInboundCleanupSpecs(params.targetCollection);
  await Promise.all(specs.map((spec) => params.onSpec(spec)));
}
