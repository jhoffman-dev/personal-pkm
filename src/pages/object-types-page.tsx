import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  addObjectTypeProperty,
  createObjectType,
  deleteObjectType,
  deleteObjectTypeProperty,
  listObjectTypes,
  updateObjectType,
  updateObjectTypeProperty,
  type ObjectPropertyType,
} from "@/lib/object-types-store";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

const OBJECT_PROPERTY_TYPES: {
  value: ObjectPropertyType;
  label: string;
}[] = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "address", label: "Address" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "picture", label: "Picture" },
  { value: "select", label: "Dropdown Select" },
  { value: "connection", label: "Connection" },
];

export function ObjectTypesPage() {
  const [objectTypes, setObjectTypes] = useState(() => listObjectTypes());
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(
    objectTypes[0]?.id ?? null,
  );
  const [newPropertyType, setNewPropertyType] =
    useState<ObjectPropertyType>("text");
  const [selectOptionsDraftByPropertyId, setSelectOptionsDraftByPropertyId] =
    useState<Record<string, string>>({});

  const selectedType = useMemo(
    () => objectTypes.find((item) => item.id === selectedTypeId) ?? null,
    [objectTypes, selectedTypeId],
  );

  const refreshObjectTypes = () => {
    const next = listObjectTypes();
    setObjectTypes(next);
    if (!next.some((item) => item.id === selectedTypeId)) {
      setSelectedTypeId(next[0]?.id ?? null);
    }
  };

  const getSelectOptionsDraftValue = (
    propertyId: string,
    options: string[],
  ) => {
    const draftValue = selectOptionsDraftByPropertyId[propertyId];
    if (draftValue !== undefined) {
      return draftValue;
    }

    return options.join("\n");
  };

  const commitSelectOptionsDraft = (propertyId: string) => {
    const draftValue = selectOptionsDraftByPropertyId[propertyId];
    if (draftValue === undefined || !selectedType) {
      return;
    }

    const options = draftValue
      .split("\n")
      .map((option) => option.trim())
      .filter(Boolean);

    updateObjectTypeProperty(selectedType.id, propertyId, {
      options,
    });

    setSelectOptionsDraftByPropertyId((previous) => {
      const next = { ...previous };
      delete next[propertyId];
      return next;
    });

    refreshObjectTypes();
  };

  const handleCreateObjectType = () => {
    const created = createObjectType();
    const next = listObjectTypes();
    setObjectTypes(next);
    setSelectedTypeId(created.id);
  };

  const handleDeleteObjectType = () => {
    if (!selectedType || selectedType.isSystem) {
      return;
    }

    if (!window.confirm(`Delete ${selectedType.name}?`)) {
      return;
    }

    const deleted = deleteObjectType(selectedType.id);
    if (!deleted) {
      return;
    }

    const next = listObjectTypes();
    setObjectTypes(next);
    setSelectedTypeId(next[0]?.id ?? null);
  };

  return (
    <section className="h-[calc(100svh-41px)] p-6">
      <Card className="h-full gap-0 py-0">
        <CardContent className="flex h-full min-h-0 p-0">
          <aside className="w-72 shrink-0 border-r p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Object Types</h2>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCreateObjectType}
              >
                <Plus className="size-4" />
                New
              </Button>
            </div>

            <div className="space-y-1 overflow-y-auto">
              {objectTypes.map((objectType) => {
                const isSelected = objectType.id === selectedTypeId;

                return (
                  <button
                    key={objectType.id}
                    type="button"
                    onClick={() => setSelectedTypeId(objectType.id)}
                    className={`w-full rounded-md border px-2 py-2 text-left text-sm ${
                      isSelected ? "bg-muted" : "bg-background"
                    }`}
                  >
                    <p className="truncate font-medium">{objectType.name}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {objectType.properties.length} propert
                      {objectType.properties.length === 1 ? "y" : "ies"}
                      {objectType.isSystem ? " • predefined" : ""}
                    </p>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {!selectedType ? (
              <p className="text-muted-foreground text-sm">
                No object type selected.
              </p>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">Configuration</h3>
                    <p className="text-muted-foreground text-sm">
                      Define schema fields for this object type. Views and
                      relationships to notes/tasks come in the next pass.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteObjectType}
                    disabled={selectedType.isSystem}
                  >
                    <Trash2 className="size-4" />
                    Delete type
                  </Button>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Type Name</h4>
                  <Input
                    value={selectedType.name}
                    onChange={(event) => {
                      updateObjectType(selectedType.id, {
                        name: event.target.value,
                      });
                      refreshObjectTypes();
                    }}
                    disabled={selectedType.isSystem}
                    placeholder="Object type name"
                  />
                  {selectedType.isSystem ? (
                    <p className="text-muted-foreground text-xs">
                      This is a predefined type.
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Cards Image Field</h4>
                  <select
                    value={selectedType.cardImagePropertyId ?? ""}
                    onChange={(event) => {
                      updateObjectType(selectedType.id, {
                        cardImagePropertyId: event.target.value || undefined,
                      });
                      refreshObjectTypes();
                    }}
                    className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                  >
                    <option value="">Auto (first picture field)</option>
                    {selectedType.properties
                      .filter((property) => property.type === "picture")
                      .map((property) => (
                        <option key={property.id} value={property.id}>
                          {property.name}
                        </option>
                      ))}
                  </select>
                  <p className="text-muted-foreground text-xs">
                    Choose which picture field appears in cards view.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Field type</label>
                      <select
                        value={newPropertyType}
                        onChange={(event) => {
                          setNewPropertyType(
                            event.target.value as ObjectPropertyType,
                          );
                        }}
                        className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                      >
                        {OBJECT_PROPERTY_TYPES.map((fieldType) => (
                          <option key={fieldType.value} value={fieldType.value}>
                            {fieldType.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        addObjectTypeProperty(selectedType.id, newPropertyType);
                        refreshObjectTypes();
                      }}
                    >
                      <Plus className="size-4" />
                      Add property
                    </Button>
                  </div>

                  {selectedType.properties.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No properties yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedType.properties.map((property) => (
                        <div
                          key={property.id}
                          className="space-y-3 rounded-md border p-3"
                        >
                          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_auto] md:items-end">
                            <div className="space-y-1">
                              <label className="text-xs font-medium">
                                Property Name
                              </label>
                              <Input
                                value={property.name}
                                onChange={(event) => {
                                  updateObjectTypeProperty(
                                    selectedType.id,
                                    property.id,
                                    {
                                      name: event.target.value,
                                    },
                                  );
                                  refreshObjectTypes();
                                }}
                                placeholder="Property name"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium">
                                Type
                              </label>
                              <Input value={property.type} disabled />
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                deleteObjectTypeProperty(
                                  selectedType.id,
                                  property.id,
                                );
                                refreshObjectTypes();
                              }}
                            >
                              <Trash2 className="size-4" />
                              Remove
                            </Button>
                          </div>

                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={property.isRequired}
                              onChange={(event) => {
                                updateObjectTypeProperty(
                                  selectedType.id,
                                  property.id,
                                  {
                                    isRequired: event.target.checked,
                                  },
                                );
                                refreshObjectTypes();
                              }}
                            />
                            Required
                          </label>

                          {property.type === "select" ? (
                            <div className="space-y-1">
                              <label className="text-xs font-medium">
                                Dropdown options (one per line)
                              </label>
                              <textarea
                                value={getSelectOptionsDraftValue(
                                  property.id,
                                  property.options ?? [],
                                )}
                                onChange={(event) => {
                                  setSelectOptionsDraftByPropertyId(
                                    (previous) => ({
                                      ...previous,
                                      [property.id]: event.target.value,
                                    }),
                                  );
                                }}
                                onBlur={() => {
                                  commitSelectOptionsDraft(property.id);
                                }}
                                rows={4}
                                className="border-input bg-background w-full rounded-md border px-2 py-2 text-sm"
                              />
                              <p className="text-muted-foreground text-xs">
                                Press Enter for a new option. Changes save when
                                the field loses focus.
                              </p>
                            </div>
                          ) : null}

                          {property.type === "date" ? (
                            <div className="space-y-1">
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={
                                    property.autoSetCurrentDateOnCreate ?? false
                                  }
                                  onChange={(event) => {
                                    updateObjectTypeProperty(
                                      selectedType.id,
                                      property.id,
                                      {
                                        autoSetCurrentDateOnCreate:
                                          event.target.checked,
                                      },
                                    );
                                    refreshObjectTypes();
                                  }}
                                />
                                Auto populate with current date on create
                              </label>
                            </div>
                          ) : null}

                          {property.type === "connection" ? (
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <label className="text-xs font-medium">
                                  Connects to object type
                                </label>
                                <select
                                  value={property.connectionTypeId ?? ""}
                                  onChange={(event) => {
                                    updateObjectTypeProperty(
                                      selectedType.id,
                                      property.id,
                                      {
                                        connectionTypeId: event.target.value,
                                        connectionReciprocalPropertyId:
                                          undefined,
                                      },
                                    );
                                    refreshObjectTypes();
                                  }}
                                  className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                                >
                                  <option value="">Select object type</option>
                                  {objectTypes
                                    .filter(
                                      (item) => item.id !== selectedType.id,
                                    )
                                    .map((item) => (
                                      <option key={item.id} value={item.id}>
                                        {item.name}
                                      </option>
                                    ))}
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-xs font-medium">
                                  Connection mode
                                </label>
                                <select
                                  value={
                                    property.connectionMultiplicity ?? "single"
                                  }
                                  onChange={(event) => {
                                    updateObjectTypeProperty(
                                      selectedType.id,
                                      property.id,
                                      {
                                        connectionMultiplicity:
                                          event.target.value === "multiple"
                                            ? "multiple"
                                            : "single",
                                      },
                                    );
                                    refreshObjectTypes();
                                  }}
                                  className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                                >
                                  <option value="single">Single</option>
                                  <option value="multiple">Multiple</option>
                                </select>
                              </div>

                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={
                                    property.connectionIsBidirectional ?? false
                                  }
                                  onChange={(event) => {
                                    updateObjectTypeProperty(
                                      selectedType.id,
                                      property.id,
                                      {
                                        connectionIsBidirectional:
                                          event.target.checked,
                                      },
                                    );
                                    refreshObjectTypes();
                                  }}
                                />
                                Keep in sync both ways
                              </label>

                              {property.connectionIsBidirectional &&
                              property.connectionTypeId ? (
                                <>
                                  <div className="space-y-1">
                                    <label className="text-xs font-medium">
                                      Reciprocal field on target type
                                    </label>
                                    <select
                                      value={
                                        property.connectionReciprocalPropertyId ??
                                        ""
                                      }
                                      onChange={(event) => {
                                        updateObjectTypeProperty(
                                          selectedType.id,
                                          property.id,
                                          {
                                            connectionReciprocalPropertyId:
                                              event.target.value || undefined,
                                          },
                                        );
                                        refreshObjectTypes();
                                      }}
                                      className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                                    >
                                      <option value="">
                                        Select reciprocal field
                                      </option>
                                      {(
                                        objectTypes
                                          .find(
                                            (item) =>
                                              item.id ===
                                              property.connectionTypeId,
                                          )
                                          ?.properties.filter(
                                            (candidate) =>
                                              candidate.type === "connection" &&
                                              candidate.connectionTypeId ===
                                                selectedType.id,
                                          ) ?? []
                                      ).map((candidate) => (
                                        <option
                                          key={candidate.id}
                                          value={candidate.id}
                                        >
                                          {candidate.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const targetType = objectTypes.find(
                                        (item) =>
                                          item.id === property.connectionTypeId,
                                      );

                                      if (!targetType) {
                                        return;
                                      }

                                      const reciprocal = addObjectTypeProperty(
                                        targetType.id,
                                        "connection",
                                      );

                                      if (!reciprocal) {
                                        return;
                                      }

                                      updateObjectTypeProperty(
                                        targetType.id,
                                        reciprocal.id,
                                        {
                                          name: `${selectedType.name} Link`,
                                          connectionTypeId: selectedType.id,
                                          connectionMultiplicity:
                                            property.connectionMultiplicity ??
                                            "single",
                                          connectionIsBidirectional: false,
                                        },
                                      );

                                      updateObjectTypeProperty(
                                        selectedType.id,
                                        property.id,
                                        {
                                          connectionReciprocalPropertyId:
                                            reciprocal.id,
                                        },
                                      );

                                      refreshObjectTypes();
                                    }}
                                  >
                                    <Plus className="size-4" />
                                    Create reciprocal field
                                  </Button>
                                </>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
