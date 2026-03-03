import type { CollectionEntityMap } from "@/data/local/local-nosql-store";
import type {
  EntityCollectionName,
  EntityId,
  RelationField,
} from "@/data/types";
import { createEntityId, nowIsoDate } from "@/data/types";
import {
  relationFieldsFromDefaults,
  uniqueEntityIds,
} from "@/data/shared/relation-domain";
import { FirestoreRelationMutator } from "@/data/firestore/firestore-relation-mutator";
import {
  detachFirestoreRelationsForDeletedEntity,
  removeFirestoreInboundRelationsToDeletedEntity,
  syncBidirectionalFirestoreRelations,
} from "@/data/firestore/firestore-relational-mutations";
import {
  chunkArray,
  sanitizeForFirestore,
} from "@/data/firestore/firestore-relational-utils";
import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  type Firestore,
} from "firebase/firestore";

type RelationArrays<TEntity> = {
  [K in RelationField<TEntity>]?: EntityId[];
};

export class FirestoreRelationalDataModule<
  TCollection extends EntityCollectionName,
  TCreate extends object,
  TUpdate extends object,
> {
  protected readonly db: Firestore;
  protected readonly uid: string;
  protected readonly collectionName: TCollection;
  protected readonly idPrefix: string;
  protected readonly relationMutator: FirestoreRelationMutator;
  protected readonly relationDefaults: RelationArrays<
    CollectionEntityMap[TCollection]
  >;

  constructor(
    db: Firestore,
    uid: string,
    collectionName: TCollection,
    idPrefix: string,
    relationDefaults: RelationArrays<CollectionEntityMap[TCollection]>,
  ) {
    this.db = db;
    this.uid = uid;
    this.collectionName = collectionName;
    this.idPrefix = idPrefix;
    this.relationMutator = new FirestoreRelationMutator(db, uid);
    this.relationDefaults = relationDefaults;
  }

  protected collectionRef() {
    return collection(this.db, "users", this.uid, this.collectionName);
  }

  protected docRef(id: EntityId) {
    return doc(this.collectionRef(), id);
  }

  async list(): Promise<CollectionEntityMap[TCollection][]> {
    const snapshot = await getDocs(this.collectionRef());
    return snapshot.docs.map(
      (record) => record.data() as CollectionEntityMap[TCollection],
    );
  }

  async listByIds(
    ids: EntityId[],
  ): Promise<CollectionEntityMap[TCollection][]> {
    const normalizedIds = uniqueEntityIds(ids);
    if (normalizedIds.length === 0) {
      return [];
    }

    const chunks = chunkArray(normalizedIds, 10);
    const allSnapshots = await Promise.all(
      chunks.map((idChunk) =>
        getDocs(
          query(this.collectionRef(), where(documentId(), "in", idChunk)),
        ),
      ),
    );

    return allSnapshots.flatMap((snapshot) =>
      snapshot.docs.map(
        (record) => record.data() as CollectionEntityMap[TCollection],
      ),
    );
  }

  async getById(
    id: EntityId,
  ): Promise<CollectionEntityMap[TCollection] | null> {
    const record = await getDoc(this.docRef(id));
    if (!record.exists()) {
      return null;
    }

    return record.data() as CollectionEntityMap[TCollection];
  }

  async create(input: TCreate): Promise<CollectionEntityMap[TCollection]> {
    const timestamp = nowIsoDate();
    const entity = {
      ...this.relationDefaults,
      ...(input as object),
      id: createEntityId(this.idPrefix),
      createdAt: timestamp,
      updatedAt: timestamp,
    } as CollectionEntityMap[TCollection];

    const normalized = this.normalizeRelations(entity);
    const persisted = sanitizeForFirestore(
      normalized,
    ) as CollectionEntityMap[TCollection];

    await setDoc(this.docRef(persisted.id), persisted);
    await syncBidirectionalFirestoreRelations({
      collectionName: this.collectionName,
      relationFields: this.getRelationFields(),
      relationMutator: this.relationMutator,
      nextEntity: persisted,
      previousEntity: null,
    });
    return persisted;
  }

  async update(
    id: EntityId,
    input: TUpdate,
  ): Promise<CollectionEntityMap[TCollection] | null> {
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      ...(input as object),
      updatedAt: nowIsoDate(),
    } as CollectionEntityMap[TCollection];

    const normalized = this.normalizeRelations(updated);
    const persisted = sanitizeForFirestore(
      normalized,
    ) as CollectionEntityMap[TCollection];

    await setDoc(this.docRef(id), persisted);
    await syncBidirectionalFirestoreRelations({
      collectionName: this.collectionName,
      relationFields: this.getRelationFields(),
      relationMutator: this.relationMutator,
      nextEntity: persisted,
      previousEntity: existing,
    });
    return persisted;
  }

  async delete(id: EntityId): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) {
      return false;
    }

    await deleteDoc(this.docRef(id));
    await detachFirestoreRelationsForDeletedEntity({
      collectionName: this.collectionName,
      relationFields: this.getRelationFields(),
      relationMutator: this.relationMutator,
      deletedEntity: existing,
    });
    await removeFirestoreInboundRelationsToDeletedEntity({
      collectionName: this.collectionName,
      relationMutator: this.relationMutator,
      deletedId: id,
    });
    return true;
  }

  async listByRelation(
    relationField: RelationField<CollectionEntityMap[TCollection]>,
    relatedId: EntityId,
  ): Promise<CollectionEntityMap[TCollection][]> {
    const relationQuery = query(
      this.collectionRef(),
      where(relationField as string, "array-contains", relatedId),
    );
    const snapshot = await getDocs(relationQuery);

    return snapshot.docs.map(
      (record) => record.data() as CollectionEntityMap[TCollection],
    );
  }

  private getRelationFields(): string[] {
    return relationFieldsFromDefaults(this.relationDefaults);
  }

  private normalizeRelations(
    entity: CollectionEntityMap[TCollection],
  ): CollectionEntityMap[TCollection] {
    const normalized = {
      ...entity,
    } as CollectionEntityMap[TCollection] & Record<string, unknown>;

    this.getRelationFields().forEach((field) => {
      const current = normalized[field];
      normalized[field] = Array.isArray(current)
        ? uniqueEntityIds(current as EntityId[])
        : [];
    });

    return normalized as CollectionEntityMap[TCollection];
  }
}
