import type {
  Company,
  Meeting,
  Note,
  Person,
  Project,
  Task,
} from "@/data/entities";
import {
  createObjectRecord,
  deleteObjectRecord,
  updateObjectRecord,
  upsertObjectRecord,
  type ObjectRecord,
  type ObjectRecordValue,
} from "@/lib/object-records-store";
import type {
  ObjectTypeDefinition,
  ObjectTypeProperty,
} from "@/lib/object-types-store";
import {
  getSystemCollectionForObjectType,
  mappedSystemFieldKey,
  type SystemEntityCollection,
} from "@/pages/objects-page-helpers";
import { companiesDataRuntime } from "@/features/companies";
import { meetingsDataRuntime } from "@/features/meetings";
import { notesDataRuntime } from "@/features/notes";
import { peopleDataRuntime } from "@/features/people";
import { projectsDataRuntime } from "@/features/projects";
import { tasksDataRuntime } from "@/features/tasks";
import { type AppDispatch } from "@/store";

type SyncBidirectionalConnection = (params: {
  sourceRecordId: string;
  property: ObjectTypeProperty;
  previousValue: ObjectRecordValue | undefined;
  nextValue: ObjectRecordValue | undefined;
}) => void;

type SetRecords = (
  updater: (previous: ObjectRecord[]) => ObjectRecord[],
) => void;

export async function createRecordForType(params: {
  targetType: ObjectTypeDefinition;
  dispatch: AppDispatch;
}): Promise<string> {
  const { targetType, dispatch } = params;
  const targetSystemCollection = getSystemCollectionForObjectType(
    targetType.id,
  );

  if (targetSystemCollection === "people") {
    const created = await peopleDataRuntime.createOne(dispatch, {
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
    });

    return created.id;
  }

  if (targetSystemCollection === "companies") {
    const created = await companiesDataRuntime.createOne(dispatch, {
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
    });

    return created.id;
  }

  if (targetSystemCollection === "projects") {
    const created = await projectsDataRuntime.createOne(dispatch, {
      name: "New Project",
      paraType: "project",
      description: "",
      tags: [],
      personIds: [],
      companyIds: [],
      noteIds: [],
      taskIds: [],
      meetingIds: [],
    });

    return created.id;
  }

  if (targetSystemCollection === "notes") {
    const created = await notesDataRuntime.createOne(dispatch, {
      title: "New Note",
      body: "<p></p>",
      tags: [],
      relatedNoteIds: [],
      personIds: [],
      companyIds: [],
      projectIds: [],
      taskIds: [],
      meetingIds: [],
    });

    return created.id;
  }

  if (targetSystemCollection === "tasks") {
    const created = await tasksDataRuntime.createOne(dispatch, {
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
    });

    return created.id;
  }

  if (targetSystemCollection === "meetings") {
    const created = await meetingsDataRuntime.createOne(dispatch, {
      title: "New Meeting",
      tags: [],
      scheduledFor: new Date().toISOString(),
      location: "",
      personIds: [],
      companyIds: [],
      projectIds: [],
      noteIds: [],
      taskIds: [],
    });

    return created.id;
  }

  const created = createObjectRecord(targetType);
  return created.id;
}

function dispatchSystemFieldUpdate(params: {
  collection: SystemEntityCollection;
  dispatch: AppDispatch;
  objectRecordId: string;
  mappedField: ReturnType<typeof mappedSystemFieldKey>;
  nextStringValue: string;
}): boolean {
  const { collection, dispatch, objectRecordId, mappedField, nextStringValue } =
    params;
  if (!mappedField) {
    return false;
  }

  if (collection === "people") {
    void peopleDataRuntime.updateOne(dispatch, {
      id: objectRecordId,
      input: { [mappedField]: nextStringValue } as Partial<Person>,
    });
    return true;
  }

  if (collection === "companies") {
    void companiesDataRuntime.updateOne(dispatch, {
      id: objectRecordId,
      input: { [mappedField]: nextStringValue } as Partial<Company>,
    });
    return true;
  }

  if (collection === "projects") {
    void projectsDataRuntime.updateOne(dispatch, {
      id: objectRecordId,
      input: { [mappedField]: nextStringValue } as Partial<Project>,
    });
    return true;
  }

  if (collection === "notes") {
    void notesDataRuntime.updateOne(dispatch, {
      id: objectRecordId,
      input: { [mappedField]: nextStringValue } as Partial<Note>,
    });
    return true;
  }

  if (collection === "tasks") {
    void tasksDataRuntime.updateOne(dispatch, {
      id: objectRecordId,
      input: { [mappedField]: nextStringValue } as Partial<Task>,
    });
    return true;
  }

  if (collection === "meetings") {
    void meetingsDataRuntime.updateOne(dispatch, {
      id: objectRecordId,
      input: { [mappedField]: nextStringValue } as Partial<Meeting>,
    });
    return true;
  }

  return false;
}

export function updateRecordField(params: {
  selectedType: ObjectTypeDefinition | null;
  selectedSystemCollection: SystemEntityCollection | null;
  objectRecordId: string;
  property: ObjectTypeProperty;
  value: unknown;
  records: ObjectRecord[];
  dispatch: AppDispatch;
  setRecords: SetRecords;
  syncBidirectionalConnection: SyncBidirectionalConnection;
}): void {
  const {
    selectedType,
    selectedSystemCollection,
    objectRecordId,
    property,
    value,
    records,
    dispatch,
    setRecords,
    syncBidirectionalConnection,
  } = params;

  if (!selectedType) {
    return;
  }

  const existingRecord = records.find((record) => record.id === objectRecordId);
  const previousValue = existingRecord?.values[property.id];

  const nextStringValue =
    typeof value === "string" ? value : String(value ?? "");
  const mappedField = mappedSystemFieldKey(selectedType, property);

  if (
    selectedSystemCollection &&
    dispatchSystemFieldUpdate({
      collection: selectedSystemCollection,
      dispatch,
      objectRecordId,
      mappedField,
      nextStringValue,
    })
  ) {
    return;
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
}

export function deleteRecord(params: {
  selectedSystemCollection: SystemEntityCollection | null;
  selectedRecordId: string;
  dispatch: AppDispatch;
}): void {
  const { selectedSystemCollection, selectedRecordId, dispatch } = params;

  if (selectedSystemCollection === "people") {
    void peopleDataRuntime.deleteOne(dispatch, selectedRecordId).then(() => {
      deleteObjectRecord(selectedRecordId);
    });
    return;
  }

  if (selectedSystemCollection === "companies") {
    void companiesDataRuntime.deleteOne(dispatch, selectedRecordId).then(() => {
      deleteObjectRecord(selectedRecordId);
    });
    return;
  }

  void deleteObjectRecord(selectedRecordId);
}
