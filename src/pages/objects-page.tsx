import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  Company,
  Meeting,
  Note,
  Person,
  Project,
  Task,
} from "@/data/entities";
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
  listObjectRecords,
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
import {
  dataActions,
  dataThunks,
  notesTabsActions,
  tasksViewActions,
  useAppDispatch,
  useAppSelector,
} from "@/store";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

type ObjectsViewMode = "table" | "list" | "cards" | "detail";
const OBJECT_VIEW_PREFERENCES_KEY = "pkm.object-view-preferences.v1";
const PEOPLE_OBJECT_TYPE_ID = "object_type_people";
const COMPANIES_OBJECT_TYPE_ID = "object_type_companies";
const PROJECTS_OBJECT_TYPE_ID = "object_type_projects";
const NOTES_OBJECT_TYPE_ID = "object_type_notes";
const TASKS_OBJECT_TYPE_ID = "object_type_tasks";
const MEETINGS_OBJECT_TYPE_ID = "object_type_meetings";

type SystemEntityCollection =
  | "people"
  | "companies"
  | "projects"
  | "notes"
  | "tasks"
  | "meetings";

function getSystemCollectionForObjectType(
  objectTypeId: string | null,
): SystemEntityCollection | null {
  if (objectTypeId === PEOPLE_OBJECT_TYPE_ID) {
    return "people";
  }

  if (objectTypeId === COMPANIES_OBJECT_TYPE_ID) {
    return "companies";
  }

  if (objectTypeId === PROJECTS_OBJECT_TYPE_ID) {
    return "projects";
  }

  if (objectTypeId === NOTES_OBJECT_TYPE_ID) {
    return "notes";
  }

  if (objectTypeId === TASKS_OBJECT_TYPE_ID) {
    return "tasks";
  }

  if (objectTypeId === MEETINGS_OBJECT_TYPE_ID) {
    return "meetings";
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
  | "title"
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

  if (objectTypeId === PROJECTS_OBJECT_TYPE_ID) {
    if (property.id === "property_project_name") {
      return "name";
    }
  }

  if (objectTypeId === NOTES_OBJECT_TYPE_ID) {
    if (property.id === "property_note_title") {
      return "title";
    }
  }

  if (objectTypeId === TASKS_OBJECT_TYPE_ID) {
    if (property.id === "property_task_title") {
      return "title";
    }
  }

  if (objectTypeId === MEETINGS_OBJECT_TYPE_ID) {
    if (property.id === "property_meeting_title") {
      return "title";
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

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return String(value);
}

function connectionIdsFromValue(
  value: ObjectRecordValue | undefined,
): string[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    if (trimmed.includes(",")) {
      return Array.from(
        new Set(
          trimmed
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean),
        ),
      );
    }

    return [trimmed];
  }

  return [];
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const peopleState = useAppSelector((state) => state.people);
  const companiesState = useAppSelector((state) => state.companies);
  const projectsState = useAppSelector((state) => state.projects);
  const notesState = useAppSelector((state) => state.notes);
  const tasksState = useAppSelector((state) => state.tasks);
  const meetingsState = useAppSelector((state) => state.meetings);
  const objectTypes = useMemo(() => listObjectTypes(), []);
  const selectableObjectTypes = useMemo(
    () => objectTypes.filter((item) => !item.isSystem),
    [objectTypes],
  );
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(
    selectableObjectTypes[0]?.id ?? null,
  );
  const [records, setRecords] = useState<ObjectRecord[]>(() =>
    selectableObjectTypes[0]?.id
      ? listObjectRecordsByType(selectableObjectTypes[0].id)
      : [],
  );
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [viewPreferencesByTypeId, setViewPreferencesByTypeId] = useState(() =>
    loadObjectViewPreferences(),
  );
  const [viewMode, setViewMode] = useState<ObjectsViewMode>(() => {
    const firstTypeId = selectableObjectTypes[0]?.id;
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
    () =>
      selectableObjectTypes.find((item) => item.id === selectedTypeId) ?? null,
    [selectableObjectTypes, selectedTypeId],
  );

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedRecordId) ?? null,
    [records, selectedRecordId],
  );

  const currentUserId = firebaseAuth.currentUser?.uid ?? null;
  const selectedSystemCollection = getSystemCollectionForObjectType(
    selectedType?.id ?? null,
  );
  const requestedTypeId = searchParams.get("typeId");
  const requestedRecordId = searchParams.get("recordId");
  const requestedViewMode = searchParams.get("view");

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
        : systemCollection === "companies"
          ? companiesState.ids
              .map((id) => companiesState.entities[id])
              .filter((entity): entity is Company => Boolean(entity))
          : systemCollection === "projects"
            ? projectsState.ids
                .map((id) => projectsState.entities[id])
                .filter((entity): entity is Project => Boolean(entity))
            : systemCollection === "notes"
              ? notesState.ids
                  .map((id) => notesState.entities[id])
                  .filter((entity): entity is Note => Boolean(entity))
              : systemCollection === "tasks"
                ? tasksState.ids
                    .map((id) => tasksState.entities[id])
                    .filter((entity): entity is Task => Boolean(entity))
                : meetingsState.ids
                    .map((id) => meetingsState.entities[id])
                    .filter((entity): entity is Meeting => Boolean(entity));

    return entities
      .map((entity) => {
        const overlay = overlayById.get(entity.id);
        const values = Object.fromEntries(
          targetType.properties.map((property) => {
            const mappedKey = mappedSystemFieldKey(targetType, property);
            const mappedValue = mappedKey
              ? ((entity as unknown as Record<string, unknown>)[
                  mappedKey
                ] as unknown)
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

    if (projectsState.status === "idle") {
      void dispatch(dataThunks.projects.fetchAll());
    }

    if (notesState.status === "idle") {
      void dispatch(dataThunks.notes.fetchAll());
    }

    if (tasksState.status === "idle") {
      void dispatch(dataThunks.tasks.fetchAll());
    }

    if (meetingsState.status === "idle") {
      void dispatch(dataThunks.meetings.fetchAll());
    }
  }, [
    companiesState.status,
    dispatch,
    meetingsState.status,
    notesState.status,
    peopleState.status,
    projectsState.status,
    tasksState.status,
  ]);

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
    meetingsState.entities,
    meetingsState.ids,
    notesState.entities,
    notesState.ids,
    peopleState.entities,
    peopleState.ids,
    projectsState.entities,
    projectsState.ids,
    selectedRecordId,
    selectedType,
    selectedTypeId,
    tasksState.entities,
    tasksState.ids,
  ]);

  useEffect(() => {
    if (!requestedTypeId) {
      return;
    }

    if (!selectableObjectTypes.some((item) => item.id === requestedTypeId)) {
      return;
    }

    if (selectedTypeId !== requestedTypeId) {
      setSelectedTypeId(requestedTypeId);
      return;
    }

    if (
      requestedViewMode === "table" ||
      requestedViewMode === "list" ||
      requestedViewMode === "cards" ||
      requestedViewMode === "detail"
    ) {
      setViewMode(requestedViewMode);
    }
  }, [
    requestedTypeId,
    requestedViewMode,
    selectableObjectTypes,
    selectedTypeId,
  ]);

  useEffect(() => {
    if (!requestedTypeId || !requestedRecordId) {
      return;
    }

    if (selectedTypeId !== requestedTypeId) {
      return;
    }

    if (!records.some((record) => record.id === requestedRecordId)) {
      return;
    }

    if (selectedRecordId !== requestedRecordId) {
      setSelectedRecordId(requestedRecordId);
    }

    if (viewMode !== "detail") {
      setViewMode("detail");
    }
  }, [
    records,
    requestedRecordId,
    requestedTypeId,
    selectedRecordId,
    selectedTypeId,
    viewMode,
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

    void createRecordForType(selectedType).then((createdId) => {
      setSelectedRecordId(createdId);
      setViewMode("detail");
    });
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

    const existingRecord = records.find(
      (record) => record.id === objectRecordId,
    );
    const previousValue = existingRecord?.values[property.id];

    const nextStringValue =
      typeof value === "string" ? value : String(value ?? "");
    const mappedField = mappedSystemFieldKey(selectedType, property);

    if (selectedSystemCollection && mappedField) {
      if (selectedSystemCollection === "people") {
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

      if (selectedSystemCollection === "companies") {
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

      if (selectedSystemCollection === "projects") {
        void dispatch(
          dataThunks.projects.updateOne({
            id: objectRecordId,
            input: {
              [mappedField]: nextStringValue,
            } as Partial<Project>,
          }),
        );
        return;
      }

      if (selectedSystemCollection === "notes") {
        void dispatch(
          dataThunks.notes.updateOne({
            id: objectRecordId,
            input: {
              [mappedField]: nextStringValue,
            } as Partial<Note>,
          }),
        );
        return;
      }

      if (selectedSystemCollection === "tasks") {
        void dispatch(
          dataThunks.tasks.updateOne({
            id: objectRecordId,
            input: {
              [mappedField]: nextStringValue,
            } as Partial<Task>,
          }),
        );
        return;
      }

      if (selectedSystemCollection === "meetings") {
        void dispatch(
          dataThunks.meetings.updateOne({
            id: objectRecordId,
            input: {
              [mappedField]: nextStringValue,
            } as Partial<Meeting>,
          }),
        );
        return;
      }
    }

    if (selectedSystemCollection) {
      const upserted = upsertObjectRecord(selectedType, objectRecordId, {
        [property.id]: value,
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

      syncBidirectionalConnection({
        sourceRecordId: objectRecordId,
        property,
        previousValue,
        nextValue: upserted.values[property.id],
      });
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

    syncBidirectionalConnection({
      sourceRecordId: objectRecordId,
      property,
      previousValue,
      nextValue: updated.values[property.id],
    });
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

  const createRecordForType = async (targetType: ObjectTypeDefinition) => {
    const targetSystemCollection = getSystemCollectionForObjectType(
      targetType.id,
    );

    if (targetSystemCollection === "people") {
      const created = await dispatch(
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
      ).unwrap();

      return created.id;
    }

    if (targetSystemCollection === "companies") {
      const created = await dispatch(
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
      ).unwrap();

      return created.id;
    }

    if (targetSystemCollection === "projects") {
      const created = await dispatch(
        dataThunks.projects.createOne({
          name: "New Project",
          paraType: "project",
          description: "",
          tags: [],
          personIds: [],
          companyIds: [],
          noteIds: [],
          taskIds: [],
          meetingIds: [],
        }),
      ).unwrap();

      return created.id;
    }

    if (targetSystemCollection === "notes") {
      const created = await dispatch(
        dataThunks.notes.createOne({
          title: "New Note",
          body: "<p></p>",
          tags: [],
          relatedNoteIds: [],
          personIds: [],
          companyIds: [],
          projectIds: [],
          taskIds: [],
          meetingIds: [],
        }),
      ).unwrap();

      return created.id;
    }

    if (targetSystemCollection === "tasks") {
      const created = await dispatch(
        dataThunks.tasks.createOne({
          title: "New Task",
          description: "",
          notes: "",
          tags: [],
          status: "inbox",
          level: "task",
          parentTaskId: null,
          dueDate: undefined,
          personIds: [],
          companyIds: [],
          projectIds: [],
          noteIds: [],
          meetingIds: [],
        }),
      ).unwrap();

      return created.id;
    }

    if (targetSystemCollection === "meetings") {
      const created = await dispatch(
        dataThunks.meetings.createOne({
          title: "New Meeting",
          tags: [],
          scheduledFor: new Date().toISOString(),
          location: "",
          personIds: [],
          companyIds: [],
          projectIds: [],
          noteIds: [],
          taskIds: [],
        }),
      ).unwrap();

      return created.id;
    }

    const created = createObjectRecord(targetType);
    return created.id;
  };

  const navigateToConnectedRecord = (
    targetTypeId: string,
    targetRecordId: string,
  ) => {
    const targetSystemCollection =
      getSystemCollectionForObjectType(targetTypeId);

    if (targetSystemCollection === "notes") {
      dispatch(
        notesTabsActions.openNoteTab({ id: targetRecordId, activate: true }),
      );
      dispatch(dataActions.notes.setSelectedId(targetRecordId));
      navigate("/notes");
      return;
    }

    if (targetSystemCollection === "tasks") {
      dispatch(dataActions.tasks.setSelectedId(targetRecordId));
      dispatch(tasksViewActions.setExpandedTaskId(targetRecordId));
      navigate("/tasks");
      return;
    }

    if (targetSystemCollection === "projects") {
      dispatch(dataActions.projects.setSelectedId(targetRecordId));
      navigate("/projects");
      return;
    }

    if (targetSystemCollection === "people") {
      dispatch(dataActions.people.setSelectedId(targetRecordId));
      navigate("/people");
      return;
    }

    if (targetSystemCollection === "companies") {
      dispatch(dataActions.companies.setSelectedId(targetRecordId));
      navigate("/companies");
      return;
    }

    if (targetSystemCollection === "meetings") {
      dispatch(dataActions.meetings.setSelectedId(targetRecordId));
      navigate("/meetings");
      return;
    }

    const params = new URLSearchParams();
    params.set("typeId", targetTypeId);
    params.set("recordId", targetRecordId);
    params.set("view", "detail");
    navigate(`/objects?${params.toString()}`);
  };

  const resolveConnectionTarget = (params: {
    connectionId: string;
    hintedTypeId?: string;
  }): {
    targetTypeId: string;
    targetType: ObjectTypeDefinition;
    targetRecord: ObjectRecord;
  } | null => {
    const tryResolveInType = (
      targetTypeId: string,
    ): {
      targetTypeId: string;
      targetType: ObjectTypeDefinition;
      targetRecord: ObjectRecord;
    } | null => {
      const targetType = objectTypes.find((item) => item.id === targetTypeId);
      if (!targetType) {
        return null;
      }

      const targetRecord = getRecordsForType(targetTypeId).find(
        (entry) => entry.id === params.connectionId,
      );

      if (!targetRecord) {
        return null;
      }

      return {
        targetTypeId,
        targetType,
        targetRecord,
      };
    };

    if (params.hintedTypeId) {
      const hintedMatch = tryResolveInType(params.hintedTypeId);
      if (hintedMatch) {
        return hintedMatch;
      }
    }

    for (const objectType of objectTypes) {
      if (objectType.id === params.hintedTypeId) {
        continue;
      }

      const match = tryResolveInType(objectType.id);
      if (match) {
        return match;
      }
    }

    const rawRecord = listObjectRecords().find(
      (entry) => entry.id === params.connectionId,
    );
    if (rawRecord) {
      const rawType = objectTypes.find(
        (item) => item.id === rawRecord.objectTypeId,
      );

      if (rawType) {
        return {
          targetTypeId: rawType.id,
          targetType: rawType,
          targetRecord: rawRecord,
        };
      }
    }

    return null;
  };

  const resolveFallbackConnectionLabel = (
    connectionId: string,
  ): string | null => {
    const rawRecord = listObjectRecords().find(
      (entry) => entry.id === connectionId,
    );
    if (!rawRecord) {
      return null;
    }

    const rawType = objectTypes.find(
      (item) => item.id === rawRecord.objectTypeId,
    );
    if (rawType) {
      return getRecordTitle(rawRecord, rawType);
    }

    const firstValue = Object.values(rawRecord.values).find((value) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }

      if (typeof value === "number") {
        return true;
      }

      if (typeof value === "string") {
        return value.trim().length > 0;
      }

      return false;
    });

    if (Array.isArray(firstValue)) {
      return firstValue.join(", ");
    }

    if (typeof firstValue === "number") {
      return String(firstValue);
    }

    if (typeof firstValue === "string") {
      const trimmed = firstValue.trim();
      return trimmed || null;
    }

    return null;
  };

  const renderReadonlyPropertyValue = (
    record: ObjectRecord,
    property: ObjectTypeProperty,
  ) => {
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
  };

  const syncBidirectionalConnection = (params: {
    sourceRecordId: string;
    property: ObjectTypeProperty;
    previousValue: ObjectRecordValue | undefined;
    nextValue: ObjectRecordValue | undefined;
  }) => {
    const { sourceRecordId, property, previousValue, nextValue } = params;

    if (
      !selectedType ||
      property.type !== "connection" ||
      !property.connectionIsBidirectional ||
      !property.connectionTypeId ||
      !property.connectionReciprocalPropertyId
    ) {
      return;
    }

    const targetType = objectTypes.find(
      (item) => item.id === property.connectionTypeId,
    );
    if (!targetType) {
      return;
    }

    const reciprocalProperty = targetType.properties.find(
      (item) =>
        item.id === property.connectionReciprocalPropertyId &&
        item.type === "connection",
    );
    if (!reciprocalProperty) {
      return;
    }

    const previousIds = connectionIdsFromValue(previousValue);
    const nextIds = connectionIdsFromValue(nextValue);

    const addedIds = nextIds.filter((id) => !previousIds.includes(id));
    const removedIds = previousIds.filter((id) => !nextIds.includes(id));

    const recordsById = new Map(
      getRecordsForType(targetType.id).map((record) => [record.id, record]),
    );

    const updateTargetReciprocal = (
      targetId: string,
      shouldInclude: boolean,
    ) => {
      const targetRecord = recordsById.get(targetId);
      if (!targetRecord) {
        return;
      }

      const currentIds = connectionIdsFromValue(
        targetRecord.values[reciprocalProperty.id],
      );

      const nextTargetIds = shouldInclude
        ? Array.from(new Set([...currentIds, sourceRecordId]))
        : currentIds.filter((id) => id !== sourceRecordId);

      const nextTargetValue: ObjectRecordValue =
        reciprocalProperty.connectionMultiplicity === "multiple"
          ? nextTargetIds
          : (nextTargetIds[0] ?? "");

      handleUpdateField(targetId, reciprocalProperty, nextTargetValue);
    };

    addedIds.forEach((targetId) => updateTargetReciprocal(targetId, true));
    removedIds.forEach((targetId) => updateTargetReciprocal(targetId, false));
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
          handleUpdateField(objectRecordId, property, nextValue);
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

                handleUpdateField(objectRecordId, property, nextIds);
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
                              {renderReadonlyPropertyValue(record, property)}
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
                    <div
                      key={record.id}
                      className="hover:bg-muted/30 w-full cursor-pointer rounded-md border p-3 text-left"
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedRecordId(record.id);
                        setViewMode("detail");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedRecordId(record.id);
                          setViewMode("detail");
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
                            <span className="font-medium">
                              {property.name}:
                            </span>
                            {renderReadonlyPropertyValue(record, property)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : viewMode === "cards" ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {records.map((record) => (
                    <div
                      key={record.id}
                      className="hover:bg-muted/20 cursor-pointer rounded-md border p-3 text-left"
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedRecordId(record.id);
                        setViewMode("detail");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedRecordId(record.id);
                          setViewMode("detail");
                        }
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
                          <div
                            key={property.id}
                            className="text-muted-foreground flex flex-wrap items-center gap-1"
                          >
                            <span className="font-medium">
                              {property.name}:
                            </span>
                            {renderReadonlyPropertyValue(record, property)}
                          </div>
                        ))}
                      </div>
                    </div>
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
