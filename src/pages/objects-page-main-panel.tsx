import { Button } from "@/components/ui/button";
import type {
  ObjectRecord,
  ObjectRecordValue,
} from "@/lib/object-records-store";
import type {
  ObjectTypeDefinition,
  ObjectTypeProperty,
} from "@/lib/object-types-store";
import { renderObjectsCollectionView } from "@/pages/objects-page-collection-views";
import type { ObjectsViewMode } from "@/pages/objects-page-helpers";
import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";

export function ObjectsPageMainPanel(params: {
  viewMode: ObjectsViewMode;
  selectedType: ObjectTypeDefinition | null;
  selectedRecord: ObjectRecord | null;
  records: ObjectRecord[];
  onSetPreferredViewMode: (nextMode: ObjectsViewMode) => void;
  onDeleteRecord: () => void;
  onSelectRecordAndOpenDetail: (recordId: string) => void;
  renderReadonlyPropertyValue: (
    record: ObjectRecord,
    property: ObjectTypeProperty,
  ) => ReactNode;
  getResolvedPictureUrl: (value: ObjectRecordValue | undefined) => string;
  renderFieldInput: (property: ObjectTypeProperty) => ReactNode;
}): JSX.Element {
  const {
    viewMode,
    selectedType,
    selectedRecord,
    records,
    onSetPreferredViewMode,
    onDeleteRecord,
    onSelectRecordAndOpenDetail,
    renderReadonlyPropertyValue,
    getResolvedPictureUrl,
    renderFieldInput,
  } = params;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          {(["table", "list", "cards", "detail"] as ObjectsViewMode[]).map(
            (mode) => (
              <Button
                key={mode}
                type="button"
                size="sm"
                variant={viewMode === mode ? "default" : "outline"}
                onClick={() => onSetPreferredViewMode(mode)}
              >
                {mode[0]?.toUpperCase() + mode.slice(1)}
              </Button>
            ),
          )}
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onDeleteRecord}
          disabled={!selectedRecord}
        >
          <Trash2 className="size-4" />
          Delete
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {!selectedType ? (
          <p className="text-muted-foreground text-sm">
            Create an object type first in Object Types.
          </p>
        ) : records.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No records for this object type yet.
          </p>
        ) : viewMode === "table" ||
          viewMode === "list" ||
          viewMode === "cards" ? (
          renderObjectsCollectionView({
            viewMode,
            selectedType,
            records,
            onSelectRecord: onSelectRecordAndOpenDetail,
            renderReadonlyPropertyValue,
            getResolvedPictureUrl,
          })
        ) : !selectedRecord ? (
          <p className="text-muted-foreground text-sm">
            Select a record to view details.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold">Record Detail</h3>
              <p className="text-muted-foreground mt-1 text-xs">
                Created {new Date(selectedRecord.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {selectedType.properties.map((property) => (
                <div key={property.id} className="space-y-1">
                  <label className="text-xs font-medium">
                    {property.name}
                    {property.isRequired ? " *" : ""}
                  </label>
                  {renderFieldInput(property)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
