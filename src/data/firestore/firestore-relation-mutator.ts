import type {
  InboundCleanupSpec,
  RelationConfig,
} from "@/data/shared/relation-domain";
import type { RelationMutator } from "@/data/shared/relation-mutator";
import type { EntityId } from "@/data/types";
import { nowIsoDate } from "@/data/types";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  type Firestore,
} from "firebase/firestore";

export class FirestoreRelationMutator implements RelationMutator {
  private readonly db: Firestore;
  private readonly uid: string;

  constructor(db: Firestore, uid: string) {
    this.db = db;
    this.uid = uid;
  }

  async addReverseLink(
    config: RelationConfig,
    relatedId: EntityId,
    sourceId: EntityId,
  ): Promise<void> {
    const targetRef = doc(
      collection(this.db, "users", this.uid, config.targetCollection),
      relatedId,
    );

    try {
      await updateDoc(targetRef, {
        [config.targetField]: arrayUnion(sourceId),
        updatedAt: nowIsoDate(),
      });
    } catch {
      // Target may not exist yet; ignore in first pass.
    }
  }

  async removeReverseLink(
    config: RelationConfig,
    relatedId: EntityId,
    sourceId: EntityId,
  ): Promise<void> {
    const targetRef = doc(
      collection(this.db, "users", this.uid, config.targetCollection),
      relatedId,
    );

    try {
      await updateDoc(targetRef, {
        [config.targetField]: arrayRemove(sourceId),
        updatedAt: nowIsoDate(),
      });
    } catch {
      // Target may not exist; ignore.
    }
  }

  async cleanupInboundReference(
    spec: InboundCleanupSpec,
    deletedId: EntityId,
  ): Promise<void> {
    const sourceRef = collection(
      this.db,
      "users",
      this.uid,
      spec.sourceCollection,
    );
    const sourceQuery = query(
      sourceRef,
      where(spec.sourceField, "array-contains", deletedId),
    );
    const sourceSnapshot = await getDocs(sourceQuery);

    await Promise.all(
      sourceSnapshot.docs.map((row) =>
        updateDoc(row.ref, {
          [spec.sourceField]: arrayRemove(deletedId),
          updatedAt: nowIsoDate(),
        }),
      ),
    );
  }
}
