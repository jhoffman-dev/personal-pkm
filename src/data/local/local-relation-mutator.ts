import type { CollectionEntityMap } from "@/data/local/local-nosql-store";
import { LocalNoSqlStore } from "@/data/local/local-nosql-store";
import type {
  InboundCleanupSpec,
  RelationConfig,
} from "@/data/shared/relation-domain";
import type { RelationMutator } from "@/data/shared/relation-mutator";
import type { EntityId } from "@/data/types";
import { nowIsoDate } from "@/data/types";

export class LocalRelationMutator implements RelationMutator {
  private readonly store: LocalNoSqlStore;

  constructor(store: LocalNoSqlStore) {
    this.store = store;
  }

  async addReverseLink(
    config: RelationConfig,
    relatedId: EntityId,
    sourceId: EntityId,
  ): Promise<void> {
    const related = this.store.getById(config.targetCollection, relatedId) as
      | (CollectionEntityMap[typeof config.targetCollection] &
          Record<string, unknown>)
      | null;

    if (!related) {
      return;
    }

    const currentValues = Array.isArray(related[config.targetField])
      ? (related[config.targetField] as EntityId[])
      : [];

    if (currentValues.includes(sourceId)) {
      return;
    }

    const updated = {
      ...related,
      [config.targetField]: [...currentValues, sourceId],
      updatedAt: nowIsoDate(),
    } as CollectionEntityMap[typeof config.targetCollection];

    this.store.set(config.targetCollection, updated);
  }

  async removeReverseLink(
    config: RelationConfig,
    relatedId: EntityId,
    sourceId: EntityId,
  ): Promise<void> {
    const related = this.store.getById(config.targetCollection, relatedId) as
      | (CollectionEntityMap[typeof config.targetCollection] &
          Record<string, unknown>)
      | null;

    if (!related) {
      return;
    }

    const currentValues = Array.isArray(related[config.targetField])
      ? (related[config.targetField] as EntityId[])
      : [];

    if (!currentValues.includes(sourceId)) {
      return;
    }

    const updated = {
      ...related,
      [config.targetField]: currentValues.filter((value) => value !== sourceId),
      updatedAt: nowIsoDate(),
    } as CollectionEntityMap[typeof config.targetCollection];

    this.store.set(config.targetCollection, updated);
  }

  async cleanupInboundReference(
    spec: InboundCleanupSpec,
    deletedId: EntityId,
  ): Promise<void> {
    const sourceRows = this.store.getAll(
      spec.sourceCollection,
    ) as (CollectionEntityMap[typeof spec.sourceCollection] &
      Record<string, unknown>)[];

    sourceRows.forEach((row) => {
      const current = Array.isArray(row[spec.sourceField])
        ? (row[spec.sourceField] as EntityId[])
        : [];

      if (!current.includes(deletedId)) {
        return;
      }

      const updated = {
        ...row,
        [spec.sourceField]: current.filter((id) => id !== deletedId),
        updatedAt: nowIsoDate(),
      } as CollectionEntityMap[typeof spec.sourceCollection];

      this.store.set(spec.sourceCollection, updated);
    });
  }
}
