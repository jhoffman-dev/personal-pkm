import type {
  ObjectRecord,
  ObjectRecordValue,
} from "@/lib/object-records-store";
import type {
  ObjectTypeDefinition,
  ObjectTypeProperty,
} from "@/lib/object-types-store";
import { getRecordTitle } from "@/pages/objects-page-formatting";
import type { ObjectsViewMode } from "@/pages/objects-page-helpers";
import type { ReactNode } from "react";

export function renderObjectsCollectionView(params: {
  viewMode: ObjectsViewMode;
  selectedType: ObjectTypeDefinition;
  records: ObjectRecord[];
  onSelectRecord: (recordId: string) => void;
  renderReadonlyPropertyValue: (
    record: ObjectRecord,
    property: ObjectTypeProperty,
  ) => ReactNode;
  getResolvedPictureUrl: (value: ObjectRecordValue | undefined) => string;
}): JSX.Element | null {
  const {
    viewMode,
    selectedType,
    records,
    onSelectRecord,
    renderReadonlyPropertyValue,
    getResolvedPictureUrl,
  } = params;

  if (viewMode === "table") {
    return (
      <div className="overflow-auto rounded-md border">
        <table className="w-full min-w-[48rem] text-sm">
          <thead>
            <tr className="bg-muted/40 text-left">
              <th className="px-3 py-2 font-medium">Record</th>
              {selectedType.properties.map((property) => (
                <th key={property.id} className="px-3 py-2 font-medium">
                  {property.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr
                key={record.id}
                className="hover:bg-muted/30 cursor-pointer border-t"
                onClick={() => {
                  onSelectRecord(record.id);
                }}
              >
                <td className="px-3 py-2 font-medium">
                  {getRecordTitle(record, selectedType)}
                </td>
                {selectedType.properties.map((property) => (
                  <td key={property.id} className="px-3 py-2 text-xs">
                    {renderReadonlyPropertyValue(record, property)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="space-y-2">
        {records.map((record) => (
          <div
            key={record.id}
            className="hover:bg-muted/30 w-full cursor-pointer rounded-md border p-3 text-left"
            role="button"
            tabIndex={0}
            onClick={() => {
              onSelectRecord(record.id);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectRecord(record.id);
              }
            }}
          >
            <p className="font-medium">
              {getRecordTitle(record, selectedType)}
            </p>
            <div className="text-muted-foreground mt-2 space-y-1 text-xs">
              {selectedType.properties.slice(0, 3).map((property) => (
                <div
                  key={property.id}
                  className="flex flex-wrap items-center gap-1"
                >
                  <span className="font-medium">{property.name}:</span>
                  {renderReadonlyPropertyValue(record, property)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (viewMode === "cards") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {records.map((record) => (
          <div
            key={record.id}
            className="hover:bg-muted/20 cursor-pointer rounded-md border p-3 text-left"
            role="button"
            tabIndex={0}
            onClick={() => {
              onSelectRecord(record.id);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectRecord(record.id);
              }
            }}
          >
            {(() => {
              const configuredPictureProperty = selectedType.cardImagePropertyId
                ? selectedType.properties.find(
                    (property) =>
                      property.id === selectedType.cardImagePropertyId &&
                      property.type === "picture",
                  )
                : null;

              const pictureProperty =
                configuredPictureProperty ??
                selectedType.properties.find(
                  (property) => property.type === "picture",
                );
              const pictureValue = pictureProperty
                ? getResolvedPictureUrl(record.values[pictureProperty.id])
                : "";

              return pictureValue ? (
                <img
                  src={pictureValue}
                  alt={`${getRecordTitle(record, selectedType)} picture`}
                  className="mb-2 h-28 w-full rounded-md border object-cover"
                />
              ) : null;
            })()}
            <p className="mb-2 font-medium">
              {getRecordTitle(record, selectedType)}
            </p>
            <div className="space-y-1 text-xs">
              {selectedType.properties.slice(0, 4).map((property) => (
                <div
                  key={property.id}
                  className="text-muted-foreground flex flex-wrap items-center gap-1"
                >
                  <span className="font-medium">{property.name}:</span>
                  {renderReadonlyPropertyValue(record, property)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}
