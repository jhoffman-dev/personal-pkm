import { Button } from "@/components/ui/button";
import type { ObjectRecord } from "@/lib/object-records-store";
import type { ObjectTypeDefinition } from "@/lib/object-types-store";
import { getRecordTitle } from "@/pages/objects-page-formatting";
import { Plus } from "lucide-react";

export function ObjectsPageSidebar(params: {
  selectableObjectTypes: ObjectTypeDefinition[];
  selectedTypeId: string | null;
  selectedType: ObjectTypeDefinition | null;
  selectedRecordId: string | null;
  records: ObjectRecord[];
  onSelectType: (nextTypeId: string | null) => void;
  onSelectRecord: (recordId: string) => void;
  onCreateRecord: () => void;
}): JSX.Element {
  const {
    selectableObjectTypes,
    selectedTypeId,
    selectedType,
    selectedRecordId,
    records,
    onSelectType,
    onSelectRecord,
    onCreateRecord,
  } = params;

  return (
    <aside className="w-72 shrink-0 border-r p-3">
      <div className="mb-3 space-y-2">
        <h2 className="text-base font-semibold">Objects</h2>
        <select
          value={selectedTypeId ?? ""}
          onChange={(event) => {
            const nextTypeId = event.target.value || null;
            onSelectType(nextTypeId);
          }}
          className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
          disabled={selectableObjectTypes.length === 0}
        >
          {selectableObjectTypes.length === 0 ? (
            <option value="">No custom object types</option>
          ) : null}
          {selectableObjectTypes.map((objectType) => (
            <option key={objectType.id} value={objectType.id}>
              {objectType.name}
            </option>
          ))}
        </select>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full"
          onClick={onCreateRecord}
          disabled={!selectedType}
        >
          <Plus className="size-4" />
          New Record
        </Button>
      </div>

      <div className="space-y-1 overflow-y-auto">
        {records.length === 0 ? (
          <p className="text-muted-foreground px-1 py-2 text-xs">
            No records yet.
          </p>
        ) : (
          records.map((record) => (
            <button
              key={record.id}
              type="button"
              onClick={() => {
                onSelectRecord(record.id);
              }}
              className={`w-full rounded-md border px-2 py-2 text-left text-sm ${
                record.id === selectedRecordId ? "bg-muted" : "bg-background"
              }`}
            >
              <p className="truncate font-medium">
                {selectedType
                  ? getRecordTitle(record, selectedType)
                  : "Untitled Record"}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Updated {new Date(record.updatedAt).toLocaleString()}
              </p>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
