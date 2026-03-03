import {
  applyBidirectionalRelationMutations,
  applyDetachRelationMutations,
  applyInboundCleanupSpecs,
} from "@/data/shared/relation-mutation-runner";
import type { EntityCollectionName, EntityId } from "@/data/types";
import { FirestoreRelationMutator } from "@/data/firestore/firestore-relation-mutator";
import type { CollectionEntityMap } from "@/data/local/local-nosql-store";

export async function syncBidirectionalFirestoreRelations<
  TCollection extends EntityCollectionName,
>(params: {
  collectionName: TCollection;
  relationFields: string[];
  relationMutator: FirestoreRelationMutator;
  nextEntity: CollectionEntityMap[TCollection];
  previousEntity: CollectionEntityMap[TCollection] | null;
}): Promise<void> {
  await applyBidirectionalRelationMutations({
    collection: params.collectionName,
    relationFields: params.relationFields,
    nextEntity: params.nextEntity,
    previousEntity: params.previousEntity,
    onAdd: (mutation) =>
      params.relationMutator.addReverseLink(
        mutation.config,
        mutation.relatedId,
        mutation.sourceId,
      ),
    onRemove: (mutation) =>
      params.relationMutator.removeReverseLink(
        mutation.config,
        mutation.relatedId,
        mutation.sourceId,
      ),
  });
}

export async function detachFirestoreRelationsForDeletedEntity<
  TCollection extends EntityCollectionName,
>(params: {
  collectionName: TCollection;
  relationFields: string[];
  relationMutator: FirestoreRelationMutator;
  deletedEntity: CollectionEntityMap[TCollection];
}): Promise<void> {
  await applyDetachRelationMutations({
    collection: params.collectionName,
    relationFields: params.relationFields,
    deletedEntity: params.deletedEntity,
    onRemove: (mutation) =>
      params.relationMutator.removeReverseLink(
        mutation.config,
        mutation.relatedId,
        mutation.sourceId,
      ),
  });
}

export async function removeFirestoreInboundRelationsToDeletedEntity(params: {
  collectionName: EntityCollectionName;
  relationMutator: FirestoreRelationMutator;
  deletedId: EntityId;
}): Promise<void> {
  await applyInboundCleanupSpecs({
    targetCollection: params.collectionName,
    onSpec: (cleanupSpec) =>
      params.relationMutator.cleanupInboundReference(
        cleanupSpec,
        params.deletedId,
      ),
  });
}
