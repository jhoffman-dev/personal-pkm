import type { EntityId } from "@/data/types";

export type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

/**
 * Feature-level entity state contract used by facades after Redux entity-slice
 * removal. It keeps fetch lifecycle fields stable for existing UI behavior.
 */
export interface EntityRuntimeState<TEntity extends { id: EntityId }> {
  ids: EntityId[];
  entities: Record<EntityId, TEntity>;
  status: AsyncStatus;
  error: string | null;
}

/** Creates a fresh idle entity runtime state. */
export function createInitialEntityRuntimeState<
  TEntity extends { id: EntityId },
>(): EntityRuntimeState<TEntity> {
  return {
    ids: [],
    entities: {},
    status: "idle",
    error: null,
  };
}

/**
 * Builds a normalized entity state snapshot from list results.
 *
 * Constraint: list ordering is preserved in `ids` so existing sort/fallback
 * behaviors remain stable.
 */
export function createEntityRuntimeStateFromList<
  TEntity extends { id: EntityId },
>(items: TEntity[]): EntityRuntimeState<TEntity> {
  return {
    ids: items.map((item) => item.id),
    entities: items.reduce<Record<EntityId, TEntity>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {}),
    status: "succeeded",
    error: null,
  };
}

/** Upserts one entity while preserving current fetch lifecycle fields. */
export function upsertEntityInRuntimeState<TEntity extends { id: EntityId }>(
  state: EntityRuntimeState<TEntity>,
  item: TEntity,
): EntityRuntimeState<TEntity> {
  const exists = Boolean(state.entities[item.id]);

  return {
    ...state,
    entities: {
      ...state.entities,
      [item.id]: item,
    },
    ids: exists ? state.ids : [...state.ids, item.id],
  };
}

/** Removes one entity while preserving current fetch lifecycle fields. */
export function removeEntityFromRuntimeState<TEntity extends { id: EntityId }>(
  state: EntityRuntimeState<TEntity>,
  id: EntityId,
): EntityRuntimeState<TEntity> {
  const entities = {
    ...state.entities,
  };
  delete entities[id];

  return {
    ...state,
    entities,
    ids: state.ids.filter((existingId) => existingId !== id),
  };
}

/** Converts unknown runtime errors to stable user-facing messages. */
export function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}
