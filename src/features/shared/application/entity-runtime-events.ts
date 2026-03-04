import type { AppDispatch } from "@/store/store";

/**
 * Mutation events mirrored from previous thunk lifecycle action names.
 *
 * This preserves store-listener relation refresh behavior while runtimes use
 * direct data-module calls instead of Redux thunks.
 */
export type EntityRuntimeMutationType = "createOne" | "updateOne" | "deleteOne";

/** Domain identifiers used in runtime mutation event emission. */
export type EntityRuntimeDomain =
  | "projects"
  | "notes"
  | "tasks"
  | "meetings"
  | "companies"
  | "people";

/**
 * Emits a thunk-compatible fulfilled action name so existing listener middleware
 * can trigger cross-domain refreshes without Redux entity thunks.
 */
export function emitEntityMutationFulfilled(
  dispatch: AppDispatch,
  domain: EntityRuntimeDomain,
  mutation: EntityRuntimeMutationType,
): void {
  dispatch({ type: `${domain}/${mutation}/fulfilled` });
}
