import type { ObjectRecord } from "@/lib/object-records-store";
import type { ObjectTypeProperty } from "@/lib/object-types-store";
import {
  connectionIdsFromValue,
  formatRecordValue,
  getRecordTitle,
} from "@/pages/objects-page-formatting";
import type { ResolvedConnectionTarget } from "@/pages/objects-page-connections";

export function renderReadonlyPropertyValue(params: {
  record: ObjectRecord;
  property: ObjectTypeProperty;
  resolveConnectionTarget: (params: {
    connectionId: string;
    hintedTypeId?: string;
  }) => ResolvedConnectionTarget | null;
  resolveFallbackConnectionLabel: (connectionId: string) => string | null;
  navigateToConnectedRecord: (
    targetTypeId: string,
    targetRecordId: string,
  ) => void;
}) {
  const {
    record,
    property,
    resolveConnectionTarget,
    resolveFallbackConnectionLabel,
    navigateToConnectedRecord,
  } = params;

  if (property.type !== "connection") {
    return formatRecordValue(record.values[property.id]) || "—";
  }

  const targetTypeId = property.connectionTypeId;
  const connectionIds = connectionIdsFromValue(record.values[property.id]);

  if (connectionIds.length === 0) {
    return "—";
  }

  return (
    <div className="flex flex-wrap gap-1">
      {connectionIds.map((connectionId) => {
        const resolvedTarget = resolveConnectionTarget({
          connectionId,
          hintedTypeId: targetTypeId,
        });
        const fallbackLabel = resolvedTarget
          ? null
          : resolveFallbackConnectionLabel(connectionId);
        const label = resolvedTarget
          ? getRecordTitle(
              resolvedTarget.targetRecord,
              resolvedTarget.targetType,
            )
          : (fallbackLabel ?? connectionId);

        return (
          <button
            key={connectionId}
            type="button"
            className="bg-muted hover:bg-muted/80 rounded px-1.5 py-0.5 text-left text-xs"
            onClick={(event) => {
              event.stopPropagation();
              if (!resolvedTarget && !targetTypeId) {
                return;
              }

              const destinationTypeId =
                resolvedTarget?.targetTypeId ?? targetTypeId;

              if (!destinationTypeId) {
                return;
              }

              navigateToConnectedRecord(destinationTypeId, connectionId);
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
