import { Button } from "@/components/ui/button";
import type { ObjectRecordValue } from "@/lib/object-records-store";
import type {
  ObjectTypeDefinition,
  ObjectTypeProperty,
} from "@/lib/object-types-store";
import type { ResolvedConnectionTarget } from "@/pages/objects-page-connections";
import {
  connectionIdsFromValue,
  getRecordTitle,
} from "@/pages/objects-page-formatting";
import { Plus } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

export function renderConnectionFieldInput(params: {
  property: ObjectTypeProperty;
  value: ObjectRecordValue | undefined;
  draftValue: string;
  objectRecordId: string;
  objectTypes: ObjectTypeDefinition[];
  getRecordsForType: (typeId: string) => {
    id: string;
    values: Record<string, ObjectRecordValue>;
  }[];
  createRecordForType: (targetType: ObjectTypeDefinition) => Promise<string>;
  setFieldDraftValues: Dispatch<SetStateAction<Record<string, string>>>;
  updateField: (
    objectRecordId: string,
    property: ObjectTypeProperty,
    value: unknown,
  ) => void;
  commitFieldDraft: (
    objectRecordId: string,
    property: ObjectTypeProperty,
    nextValue: string,
  ) => void;
  resolveConnectionTarget: (params: {
    connectionId: string;
    hintedTypeId?: string;
  }) => ResolvedConnectionTarget | null;
  resolveFallbackConnectionLabel: (connectionId: string) => string | null;
  navigateToConnectedRecord: (
    targetTypeId: string,
    targetRecordId: string,
  ) => void;
}): JSX.Element {
  const {
    property,
    value,
    draftValue,
    objectRecordId,
    objectTypes,
    getRecordsForType,
    createRecordForType,
    setFieldDraftValues,
    updateField,
    commitFieldDraft,
    resolveConnectionTarget,
    resolveFallbackConnectionLabel,
    navigateToConnectedRecord,
  } = params;

  const targetTypeId = property.connectionTypeId;
  const targetType = objectTypes.find((item) => item.id === targetTypeId);
  const connectionRecords = targetTypeId ? getRecordsForType(targetTypeId) : [];
  const connectionRecordsById = new Map(
    connectionRecords.map((record) => [record.id, record]),
  );
  const selectedConnectionIds = connectionIdsFromValue(value);

  const canCreateConnectedRecord = Boolean(targetType);

  const createLinkedRecord = () => {
    if (!targetType) {
      return;
    }

    void createRecordForType(targetType).then((createdId) => {
      const nextIds =
        property.connectionMultiplicity === "multiple"
          ? Array.from(new Set([...selectedConnectionIds, createdId]))
          : [createdId];

      const nextValue: ObjectRecordValue =
        property.connectionMultiplicity === "multiple"
          ? nextIds
          : (nextIds[0] ?? "");

      setFieldDraftValues((previous) => ({
        ...previous,
        [property.id]:
          property.connectionMultiplicity === "multiple"
            ? nextIds.join(",")
            : (nextIds[0] ?? ""),
      }));
      updateField(objectRecordId, property, nextValue);
    });
  };

  const selectedConnectionLinks =
    targetTypeId && selectedConnectionIds.length > 0 ? (
      <div className="flex flex-wrap gap-1">
        {selectedConnectionIds.map((connectionId) => {
          const targetRecord = connectionRecordsById.get(connectionId);
          const resolvedTarget =
            targetType && targetRecord
              ? {
                  targetTypeId,
                  targetType,
                  targetRecord,
                }
              : resolveConnectionTarget({
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
              onClick={() => {
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
    ) : null;

  if (property.connectionMultiplicity === "multiple") {
    return (
      <div className="space-y-2">
        <select
          multiple
          value={selectedConnectionIds}
          onChange={(event) => {
            const nextIds = Array.from(event.target.selectedOptions).map(
              (option) => option.value,
            );

            setFieldDraftValues((previous) => ({
              ...previous,
              [property.id]: nextIds.join(","),
            }));

            updateField(objectRecordId, property, nextIds);
          }}
          className="border-input bg-background min-h-28 w-full rounded-md border px-2 py-2 text-sm"
        >
          {connectionRecords.map((record) => (
            <option key={record.id} value={record.id}>
              {targetType ? getRecordTitle(record, targetType) : record.id}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!canCreateConnectedRecord}
            onClick={createLinkedRecord}
          >
            <Plus className="size-4" />
            New linked record
          </Button>
        </div>

        {selectedConnectionLinks}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <select
        value={draftValue}
        onChange={(event) => {
          const nextValue = event.target.value;
          setFieldDraftValues((previous) => ({
            ...previous,
            [property.id]: nextValue,
          }));
          commitFieldDraft(objectRecordId, property, nextValue);
        }}
        className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
      >
        <option value="">
          {targetType
            ? `Select ${targetType.name} record`
            : "Select target object type first"}
        </option>
        {connectionRecords.map((record) => (
          <option key={record.id} value={record.id}>
            {targetType ? getRecordTitle(record, targetType) : record.id}
          </option>
        ))}
      </select>

      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!canCreateConnectedRecord}
        onClick={createLinkedRecord}
      >
        <Plus className="size-4" />
        New linked record
      </Button>

      {selectedConnectionLinks}
    </div>
  );
}
