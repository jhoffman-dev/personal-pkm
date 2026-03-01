import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Company, Person } from "@/data/entities";
import { firebaseAuth } from "@/lib/firebase";
import {
  deleteObjectImageForUser,
  isDataImageUrl,
  isRemoteImageUrl,
  isStoragePathValue,
  resolveObjectImageUrl,
  uploadObjectImageForUser,
} from "@/lib/object-images-storage";
import {
  createObjectRecord,
  deleteObjectRecord,
  listObjectRecordsByType,
  upsertObjectRecord,
  updateObjectRecord,
  type ObjectRecord,
  type ObjectRecordValue,
} from "@/lib/object-records-store";
import {
  listObjectTypes,
  type ObjectTypeDefinition,
  type ObjectTypeProperty,
} from "@/lib/object-types-store";
import { dataThunks, useAppDispatch, useAppSelector } from "@/store";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type ObjectsViewMode = "table" | "list" | "cards" | "detail";
const OBJECT_VIEW_PREFERENCES_KEY = "pkm.object-view-preferences.v1";
const PEOPLE_OBJECT_TYPE_ID = "object_type_people";
const COMPANIES_OBJECT_TYPE_ID = "object_type_companies";

type SystemEntityCollection = "people" | "companies";

function getSystemCollectionForObjectType(
  objectTypeId: string | null,
): SystemEntityCollection | null {
  if (objectTypeId === PEOPLE_OBJECT_TYPE_ID) {
    return "people";
  }

  if (objectTypeId === COMPANIES_OBJECT_TYPE_ID) {
    return "companies";
  }

  return null;
}

function mappedSystemFieldKey(
  objectType: ObjectTypeDefinition,
  property: ObjectTypeProperty,
):
  | "firstName"
  | "lastName"
  | "name"
  | "email"
  | "phone"
  | "address"
  | "photoUrl"
  | null {
  const preferredPictureProperty =
    objectType.cardImagePropertyId &&
    objectType.properties.some(
      (item) =>
        item.id === objectType.cardImagePropertyId && item.type === "picture",
    )
      ? objectType.cardImagePropertyId
      : objectType.properties.find((item) => item.type === "picture")?.id;

  if (
    property.type === "picture" &&
    preferredPictureProperty &&
    property.id === preferredPictureProperty
  ) {
    return "photoUrl";
  }

  const objectTypeId = objectType.id;

  if (objectTypeId === PEOPLE_OBJECT_TYPE_ID) {
    if (property.id === "property_first_name") {
      return "firstName";
    }

    if (property.id === "property_last_name") {
      return "lastName";
    }

    if (property.id === "property_email") {
      return "email";
    }

    if (property.id === "property_phone") {
      return "phone";
    }

    if (property.id === "property_address") {
      return "address";
    }
  }

  if (objectTypeId === COMPANIES_OBJECT_TYPE_ID) {
    if (property.id === "property_company_name") {
      return "name";
    }

    if (property.id === "property_email") {
      return "email";
    }

    if (property.id === "property_phone") {
      return "phone";
    }

    if (property.id === "property_address") {
      return "address";
    }
  }

  return null;
}

function defaultValueForProperty(
  property: ObjectTypeProperty,
): ObjectRecordValue {
  if (property.type === "date" && property.autoSetCurrentDateOnCreate) {
    return new Date().toISOString().slice(0, 10);
  }

  if (property.type === "select") {
    return property.options?.[0] ?? "";
  }

  return "";
}

function loadObjectViewPreferences(): Record<string, ObjectsViewMode> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(OBJECT_VIEW_PREFERENCES_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const entries = Object.entries(parsed as Record<string, unknown>).filter(
      ([, value]) =>
        value === "table" ||
        value === "list" ||
        value === "cards" ||
        value === "detail",
    ) as Array<[string, ObjectsViewMode]>;

    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

function saveObjectViewPreferences(
  preferences: Record<string, ObjectsViewMode>,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    OBJECT_VIEW_PREFERENCES_KEY,
    JSON.stringify(preferences),
  );
}

function formatRecordValue(value: ObjectRecordValue | undefined): string {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value);
}

function getRecordTitle(
  record: ObjectRecord,
  objectType: ObjectTypeDefinition,
): string {
  const firstNamedProperty = objectType.properties.find(
    (property) => property.type !== "connection" && property.type !== "picture",
  );

  if (!firstNamedProperty) {
    return "Untitled Record";
  }

  const value = record.values[firstNamedProperty.id];
  const label = formatRecordValue(value).trim();
  return label || "Untitled Record";
}

export function ObjectsPage() {
  const dispatch = useAppDispatch();
  const peopleState = useAppSelector((state) => state.people);
  const companiesState = useAppSelector((state) => state.companies);
  const objectTypes = useMemo(() => listObjectTypes(), []);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(
    objectTypes[0]?.id ?? null,
  );
  const [records, setRecords] = useState<ObjectRecord[]>(() =>
    objectTypes[0]?.id ? listObjectRecordsByType(objectTypes[0].id) : [],
  );
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [viewPreferencesByTypeId, setViewPreferencesByTypeId] = useState(() =>
    loadObjectViewPreferences(),
  );
  const [viewMode, setViewMode] = useState<ObjectsViewMode>(() => {
    const firstTypeId = objectTypes[0]?.id;
    if (!firstTypeId) {
      return "table";
    }

    return loadObjectViewPreferences()[firstTypeId] ?? "table";
  });
  const [resolvedPictureUrls, setResolvedPictureUrls] = useState<
    Record<string, string>
  >({});
  const [uploadingPicturePropertyId, setUploadingPicturePropertyId] = useState<
    string | null
  >(null);
  const [fieldDraftValues, setFieldDraftValues] = useState<
    Record<string, string>
  >({});
  const pendingCommitTimeoutIdsRef = useRef<Record<string, number>>({});
  const pictureFileInputRefs = useRef<Record<string, HTMLInputElement | null>>(
    {},
  );

  const selectedType = useMemo(
    () => objectTypes.find((item) => item.id === selectedTypeId) ?? null,
    [objectTypes, selectedTypeId],
  );

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedRecordId) ?? null,
    [records, selectedRecordId],
  );

  const currentUserId = firebaseAuth.currentUser?.uid ?? null;
  const selectedSystemCollection = getSystemCollectionForObjectType(
    selectedType?.id ?? null,
  );

  const getRecordsForType = (typeId: string): ObjectRecord[] => {
    const targetType = objectTypes.find((item) => item.id === typeId);
    if (!targetType) {
      return [];
    }

    const systemCollection = getSystemCollectionForObjectType(typeId);
    if (!systemCollection) {
      return listObjectRecordsByType(typeId);
    }

    const overlayById = new Map(
      listObjectRecordsByType(typeId).map((record) => [record.id, record]),
    );

    const entities =
      systemCollection === "people"
        ? peopleState.ids
            .map((id) => peopleState.entities[id])
            .filter((entity): entity is Person => Boolean(entity))
        : companiesState.ids
            .map((id) => companiesState.entities[id])
            .filter((entity): entity is Company => Boolean(entity));

    return entities
      .map((entity) => {
        const overlay = overlayById.get(entity.id);
        const values = Object.fromEntries(
          targetType.properties.map((property) => {
            const mappedKey = mappedSystemFieldKey(targetType, property);
            const mappedValue = mappedKey
              ? (entity[mappedKey as keyof (Person | Company)] as unknown)
              : undefined;

            const value =
              mappedValue !== undefined && mappedValue !== null
                ? (String(mappedValue) as ObjectRecordValue)
                : (overlay?.values[property.id] ??
                  defaultValueForProperty(property));

            return [property.id, value];
          }),
        );

        return {
          id: entity.id,
          objectTypeId: typeId,
          values,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
        } satisfies ObjectRecord;
      })
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  };

  useEffect(() => {
    if (peopleState.status === "idle") {
      void dispatch(dataThunks.people.fetchAll());
    }

    if (companiesState.status === "idle") {
      void dispatch(dataThunks.companies.fetchAll());
    }
  }, [companiesState.status, dispatch, peopleState.status]);

  useEffect(() => {
    if (!selectedTypeId || !selectedType) {
      setRecords([]);
      setSelectedRecordId(null);
      return;
    }

    const nextRecords = getRecordsForType(selectedTypeId);

    setRecords(nextRecords);
    if (!nextRecords.some((record) => record.id === selectedRecordId)) {
      setSelectedRecordId(nextRecords[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    companiesState.entities,
    companiesState.ids,
    peopleState.entities,
    peopleState.ids,
    selectedRecordId,
    selectedType,
    selectedTypeId,
  ]);

  useEffect(() => {
    if (!selectedType) {
      return;
    }

    const pictureProperties = selectedType.properties.filter(
      (property) => property.type === "picture",
    );

    if (pictureProperties.length === 0) {
      return;
    }

    const valuesToResolve = new Set<string>();

    records.forEach((record) => {
      pictureProperties.forEach((property) => {
        const value = formatRecordValue(record.values[property.id]).trim();
        if (value) {
          valuesToResolve.add(value);
        }
      });
    });

    const unresolvedValues = [...valuesToResolve].filter(
      (value) => resolvedPictureUrls[value] === undefined,
    );

    if (unresolvedValues.length === 0) {
      return;
    }

    let isCancelled = false;

    void Promise.all(
      unresolvedValues.map(async (value) => {
        if (isRemoteImageUrl(value) || isDataImageUrl(value)) {
          return [value, value] as const;
        }

        if (!currentUserId) {
          return [value, ""] as const;
        }

        try {
          const downloadUrl = await resolveObjectImageUrl({
            userId: currentUserId,
            value,
          });
          return [value, downloadUrl] as const;
        } catch {
          return [value, ""] as const;
        }
      }),
    ).then((entries) => {
      if (isCancelled) {
        return;
      }

      setResolvedPictureUrls((previous) => {
        const next = { ...previous };
        entries.forEach(([value, resolvedValue]) => {
          next[value] = resolvedValue;
        });
        return next;
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [currentUserId, records, resolvedPictureUrls, selectedType]);

  const getResolvedPictureUrl = (
    value: ObjectRecordValue | undefined,
  ): string => {
    const formatted = formatRecordValue(value).trim();

    if (!formatted) {
      return "";
    }

    if (isRemoteImageUrl(formatted) || isDataImageUrl(formatted)) {
      return formatted;
    }

    return resolvedPictureUrls[formatted] ?? "";
  };

  const clearPendingCommit = (propertyId: string) => {
    const timeoutId = pendingCommitTimeoutIdsRef.current[propertyId];
    if (timeoutId === undefined) {
      return;
    }

    window.clearTimeout(timeoutId);
    delete pendingCommitTimeoutIdsRef.current[propertyId];
  };

  const handleCreateRecord = () => {
    if (!selectedType) {
      return;
    }

    if (selectedSystemCollection === "people") {
      void dispatch(
        dataThunks.people.createOne({
          firstName: "New",
          lastName: "Person",
          photoUrl: "",
          tags: [],
          email: "",
          phone: "",
          address: "",
          companyIds: [],
          projectIds: [],
          noteIds: [],
          taskIds: [],
          meetingIds: [],
        }),
      )
        .unwrap()
        .then((created) => {
          setSelectedRecordId(created.id);
          setViewMode("detail");
        });
      return;
    }

    if (selectedSystemCollection === "companies") {
      void dispatch(
        dataThunks.companies.createOne({
          name: "New Company",
          photoUrl: "",
          tags: [],
          email: "",
          phone: "",
          address: "",
          website: "",
          personIds: [],
          projectIds: [],
          noteIds: [],
          taskIds: [],
          meetingIds: [],
        }),
      )
        .unwrap()
        .then((created) => {
          setSelectedRecordId(created.id);
          setViewMode("detail");
        });
      return;
    }

    const created = createObjectRecord(selectedType);
    setSelectedRecordId(created.id);
    setViewMode("detail");
  };

  const setPreferredViewMode = (nextMode: ObjectsViewMode) => {
    setViewMode(nextMode);

    if (!selectedTypeId) {
      return;
    }

    setViewPreferencesByTypeId((previous) => {
      const next = {
        ...previous,
        [selectedTypeId]: nextMode,
      };

      saveObjectViewPreferences(next);
      return next;
    });
  };

  const handleDeleteRecord = () => {
    if (!selectedRecord || !selectedType) {
      return;
    }

    if (!window.confirm("Delete this record?")) {
      return;
    }

    if (selectedSystemCollection === "people") {
      void dispatch(dataThunks.people.deleteOne(selectedRecord.id))
        .unwrap()
        .then(() => {
          deleteObjectRecord(selectedRecord.id);
        });
      return;
    }

    if (selectedSystemCollection === "companies") {
      void dispatch(dataThunks.companies.deleteOne(selectedRecord.id))
        .unwrap()
        .then(() => {
          deleteObjectRecord(selectedRecord.id);
        });
      return;
    }

    const deleted = deleteObjectRecord(selectedRecord.id);
    if (!deleted) {
      return;
    }
  };

  const handleUpdateField = (
    objectRecordId: string,
    property: ObjectTypeProperty,
    value: unknown,
  ) => {
    if (!selectedType) {
      return;
    }

    const nextStringValue =
      typeof value === "string" ? value : String(value ?? "");
    const mappedField = mappedSystemFieldKey(selectedType, property);

    if (selectedSystemCollection === "people" && mappedField) {
      void dispatch(
        dataThunks.people.updateOne({
          id: objectRecordId,
          input: {
            [mappedField]: nextStringValue,
          } as Partial<Person>,
        }),
      );
      return;
    }

    if (selectedSystemCollection === "companies" && mappedField) {
      void dispatch(
        dataThunks.companies.updateOne({
          id: objectRecordId,
          input: {
            [mappedField]: nextStringValue,
          } as Partial<Company>,
        }),
      );
      return;
    }

    if (selectedSystemCollection) {
      const upserted = upsertObjectRecord(selectedType, objectRecordId, {
        [property.id]: nextStringValue,
      });

      setRecords((previous) =>
        previous.map((record) =>
          record.id === upserted.id
            ? {
                ...record,
                values: {
                  ...record.values,
                  ...upserted.values,
                },
                updatedAt: upserted.updatedAt,
              }
            : record,
        ),
      );
      return;
    }

    const updated = updateObjectRecord(selectedType, objectRecordId, {
      [property.id]: value,
    });

    if (!updated) {
      return;
    }

    setRecords((previous) =>
      previous.map((record) => (record.id === updated.id ? updated : record)),
    );
  };

  useEffect(() => {
    const pending = pendingCommitTimeoutIdsRef.current;
    Object.values(pending).forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    pendingCommitTimeoutIdsRef.current = {};

    if (!selectedRecord || !selectedType) {
      setFieldDraftValues({});
      return;
    }

    const nextDraftValues = Object.fromEntries(
      selectedType.properties.map((property) => [
        property.id,
        formatRecordValue(selectedRecord.values[property.id]),
      ]),
    );

    setFieldDraftValues(nextDraftValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRecord?.id, selectedType]);

  useEffect(() => {
    return () => {
      const pending = pendingCommitTimeoutIdsRef.current;
      Object.values(pending).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      pendingCommitTimeoutIdsRef.current = {};
    };
  }, []);

  const commitFieldDraft = (
    objectRecordId: string,
    property: ObjectTypeProperty,
    nextValue: string,
  ) => {
    clearPendingCommit(property.id);
    handleUpdateField(objectRecordId, property, nextValue);
  };

  const scheduleFieldDraftCommit = (
    objectRecordId: string,
    property: ObjectTypeProperty,
    nextValue: string,
    delayMs = 300,
  ) => {
    clearPendingCommit(property.id);

    const timeoutId = window.setTimeout(() => {
      handleUpdateField(objectRecordId, property, nextValue);
      delete pendingCommitTimeoutIdsRef.current[property.id];
    }, delayMs);

    pendingCommitTimeoutIdsRef.current[property.id] = timeoutId;
  };

  const uploadPictureFile = (params: {
    objectRecordId: string;
    property: ObjectTypeProperty;
    file: File;
  }) => {
    const { objectRecordId, property, file } = params;

    if (!selectedType) {
      return;
    }

    const userId = firebaseAuth.currentUser?.uid;
    if (!userId) {
      window.alert("Sign in is required to upload images.");
      return;
    }

    setUploadingPicturePropertyId(property.id);

    void uploadObjectImageForUser({
      userId,
      objectTypeId: selectedType.id,
      objectRecordId,
      propertyId: property.id,
      file,
    })
      .then(({ storagePath, downloadUrl }) => {
        setResolvedPictureUrls((previous) => ({
          ...previous,
          [storagePath]: downloadUrl,
        }));

        setFieldDraftValues((previous) => ({
          ...previous,
          [property.id]: storagePath,
        }));
        commitFieldDraft(objectRecordId, property, storagePath);
      })
      .catch(() => {
        window.alert("Unable to upload image.");
      })
      .finally(() => {
        setUploadingPicturePropertyId((current) =>
          current === property.id ? null : current,
        );
      });
  };

  const renderFieldInput = (property: ObjectTypeProperty) => {
    if (!selectedRecord || !selectedType) {
      return null;
    }

    const objectRecordId = selectedRecord.id;
    const value = selectedRecord.values[property.id];
    const storedValue = formatRecordValue(value);
    const draftValue = fieldDraftValues[property.id] ?? storedValue;

    if (property.type === "select") {
      return (
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
          <option value="">Select option</option>
          {(property.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (property.type === "connection") {
      const targetTypeId = property.connectionTypeId;
      const targetType = objectTypes.find((item) => item.id === targetTypeId);
      const connectionRecords = targetTypeId
        ? getRecordsForType(targetTypeId)
        : [];

      return (
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
      );
    }

    if (property.type === "picture") {
      const previewUrl = getResolvedPictureUrl(value);

      return (
        <div className="space-y-2">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={`${property.name} preview`}
              className="h-28 w-28 rounded-md border object-cover"
            />
          ) : null}

          <div
            tabIndex={0}
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              const droppedFile = Array.from(event.dataTransfer.files).find(
                (file) => file.type.startsWith("image/"),
              );

              if (!droppedFile || uploadingPicturePropertyId === property.id) {
                return;
              }

              uploadPictureFile({
                objectRecordId,
                property,
                file: droppedFile,
              });
            }}
            onPaste={(event) => {
              const pastedFile = Array.from(event.clipboardData.items)
                .map((item) => item.getAsFile())
                .find(
                  (file): file is File =>
                    file instanceof File && file.type.startsWith("image/"),
                );

              if (!pastedFile || uploadingPicturePropertyId === property.id) {
                return;
              }

              event.preventDefault();
              uploadPictureFile({
                objectRecordId,
                property,
                file: pastedFile,
              });
            }}
            className="border-input bg-background rounded-md border border-dashed p-3 text-sm"
          >
            <p className="text-muted-foreground text-xs">
              Drag & drop or paste an image here.
            </p>

            <div className="mt-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={uploadingPicturePropertyId === property.id}
                onClick={() => {
                  pictureFileInputRefs.current[property.id]?.click();
                }}
              >
                Pick image
              </Button>
            </div>

            <input
              ref={(element) => {
                pictureFileInputRefs.current[property.id] = element;
              }}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file || uploadingPicturePropertyId === property.id) {
                  event.currentTarget.value = "";
                  return;
                }

                uploadPictureFile({
                  objectRecordId,
                  property,
                  file,
                });

                event.currentTarget.value = "";
              }}
            />
          </div>

          {uploadingPicturePropertyId === property.id ? (
            <p className="text-muted-foreground text-xs">Uploading image...</p>
          ) : null}

          {draftValue ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const valueToDelete = draftValue.trim();
                const userId = firebaseAuth.currentUser?.uid;

                if (userId && isStoragePathValue(valueToDelete)) {
                  void deleteObjectImageForUser({
                    userId,
                    value: valueToDelete,
                  }).catch(() => {
                    window.alert("Unable to delete image from storage.");
                  });
                }

                setResolvedPictureUrls((previous) => {
                  if (!(valueToDelete in previous)) {
                    return previous;
                  }

                  const next = { ...previous };
                  delete next[valueToDelete];
                  return next;
                });

                setFieldDraftValues((previous) => ({
                  ...previous,
                  [property.id]: "",
                }));
                commitFieldDraft(objectRecordId, property, "");
              }}
            >
              Clear image
            </Button>
          ) : null}
        </div>
      );
    }

    const inputType =
      property.type === "email"
        ? "email"
        : property.type === "phone"
          ? "tel"
          : property.type === "number"
            ? "number"
            : property.type === "date"
              ? "date"
              : "text";

    return (
      <Input
        value={draftValue}
        type={inputType}
        onChange={(event) => {
          const nextValue = event.target.value;
          setFieldDraftValues((previous) => ({
            ...previous,
            [property.id]: nextValue,
          }));
          scheduleFieldDraftCommit(objectRecordId, property, nextValue);
        }}
        onBlur={(event) => {
          commitFieldDraft(objectRecordId, property, event.target.value);
        }}
        placeholder={property.name}
      />
    );
  };

  return (
    <section className="h-[calc(100svh-41px)] p-6">
      <Card className="h-full gap-0 py-0">
        <CardContent className="flex h-full min-h-0 p-0">
          <aside className="w-72 shrink-0 border-r p-3">
            <div className="mb-3 space-y-2">
              <h2 className="text-base font-semibold">Objects</h2>
              <select
                value={selectedTypeId ?? ""}
                onChange={(event) => {
                  const nextTypeId = event.target.value || null;
                  setSelectedTypeId(nextTypeId);

                  setSelectedRecordId(null);
                  setViewMode(
                    nextTypeId
                      ? (viewPreferencesByTypeId[nextTypeId] ?? "table")
                      : "table",
                  );
                }}
                className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
              >
                {objectTypes.map((objectType) => (
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
                onClick={handleCreateRecord}
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
                      setSelectedRecordId(record.id);
                      setViewMode("detail");
                    }}
                    className={`w-full rounded-md border px-2 py-2 text-left text-sm ${
                      record.id === selectedRecordId
                        ? "bg-muted"
                        : "bg-background"
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

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b p-3">
              <div className="flex items-center gap-2">
                {(
                  ["table", "list", "cards", "detail"] as ObjectsViewMode[]
                ).map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    size="sm"
                    variant={viewMode === mode ? "default" : "outline"}
                    onClick={() => setPreferredViewMode(mode)}
                  >
                    {mode[0]?.toUpperCase() + mode.slice(1)}
                  </Button>
                ))}
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleDeleteRecord}
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
              ) : viewMode === "table" ? (
                <div className="overflow-auto rounded-md border">
                  <table className="w-full min-w-[48rem] text-sm">
                    <thead>
                      <tr className="bg-muted/40 text-left">
                        <th className="px-3 py-2 font-medium">Record</th>
                        {selectedType.properties.map((property) => (
                          <th
                            key={property.id}
                            className="px-3 py-2 font-medium"
                          >
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
                            setSelectedRecordId(record.id);
                            setViewMode("detail");
                          }}
                        >
                          <td className="px-3 py-2 font-medium">
                            {getRecordTitle(record, selectedType)}
                          </td>
                          {selectedType.properties.map((property) => (
                            <td key={property.id} className="px-3 py-2 text-xs">
                              {formatRecordValue(record.values[property.id]) ||
                                "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : viewMode === "list" ? (
                <div className="space-y-2">
                  {records.map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      className="hover:bg-muted/30 w-full rounded-md border p-3 text-left"
                      onClick={() => {
                        setSelectedRecordId(record.id);
                        setViewMode("detail");
                      }}
                    >
                      <p className="font-medium">
                        {getRecordTitle(record, selectedType)}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {selectedType.properties
                          .slice(0, 3)
                          .map((property) => {
                            const value = formatRecordValue(
                              record.values[property.id],
                            );
                            return `${property.name}: ${value || "—"}`;
                          })
                          .join(" • ")}
                      </p>
                    </button>
                  ))}
                </div>
              ) : viewMode === "cards" ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {records.map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      className="hover:bg-muted/20 rounded-md border p-3 text-left"
                      onClick={() => {
                        setSelectedRecordId(record.id);
                        setViewMode("detail");
                      }}
                    >
                      {(() => {
                        const configuredPictureProperty =
                          selectedType.cardImagePropertyId
                            ? selectedType.properties.find(
                                (property) =>
                                  property.id ===
                                    selectedType.cardImagePropertyId &&
                                  property.type === "picture",
                              )
                            : null;

                        const pictureProperty =
                          configuredPictureProperty ??
                          selectedType.properties.find(
                            (property) => property.type === "picture",
                          );
                        const pictureValue = pictureProperty
                          ? getResolvedPictureUrl(
                              record.values[pictureProperty.id],
                            )
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
                          <p
                            key={property.id}
                            className="text-muted-foreground truncate"
                          >
                            {property.name}:{" "}
                            {formatRecordValue(record.values[property.id]) ||
                              "—"}
                          </p>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              ) : !selectedRecord ? (
                <p className="text-muted-foreground text-sm">
                  Select a record to view details.
                </p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold">Record Detail</h3>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Created{" "}
                      {new Date(selectedRecord.createdAt).toLocaleString()}
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
        </CardContent>
      </Card>
    </section>
  );
}
