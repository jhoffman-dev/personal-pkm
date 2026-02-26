import type {
  RelationConfig,
  InboundCleanupSpec,
} from "@/data/shared/relation-domain";
import type { EntityId } from "@/data/types";

/**
 * Storage-specific relation mutation operations.
 *
 * Implementations encapsulate persistence details (local store, Firestore, etc.)
 * while relation planning and orchestration remain shared.
 */
export interface RelationMutator {
  addReverseLink(
    config: RelationConfig,
    relatedId: EntityId,
    sourceId: EntityId,
  ): Promise<void>;

  removeReverseLink(
    config: RelationConfig,
    relatedId: EntityId,
    sourceId: EntityId,
  ): Promise<void>;

  cleanupInboundReference(
    spec: InboundCleanupSpec,
    deletedId: EntityId,
  ): Promise<void>;
}
