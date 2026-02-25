import type {
  CreateCompanyInput,
  CreateMeetingInput,
  CreateNoteInput,
  CreatePersonInput,
  CreateProjectInput,
  CreateTaskInput,
  UpdateCompanyInput,
  UpdateMeetingInput,
  UpdateNoteInput,
  UpdatePersonInput,
  UpdateProjectInput,
  UpdateTaskInput,
} from "@/data/entities";
import type {
  CompaniesDataModule,
  CompanyAssociatedRecords,
  DataModules,
  MeetingsDataModule,
  MeetingAssociatedRecords,
  NotesDataModule,
  NoteAssociatedRecords,
  PeopleDataModule,
  ProjectAssociatedRecords,
  ProjectsDataModule,
  TaskAssociatedRecords,
  TasksDataModule,
} from "@/data/interfaces";
import type { CollectionEntityMap } from "@/data/local/local-nosql-store";
import type {
  EntityCollectionName,
  EntityId,
  RelationField,
} from "@/data/types";
import { createEntityId, nowIsoDate } from "@/data/types";
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from "firebase/firestore";

type RelationArrays<TEntity> = {
  [K in RelationField<TEntity>]?: EntityId[];
};

type RelationConfig = {
  targetCollection: EntityCollectionName;
  targetField: string;
};

const RELATION_CONFIG: Record<
  EntityCollectionName,
  Partial<Record<string, RelationConfig>>
> = {
  projects: {
    personIds: { targetCollection: "people", targetField: "projectIds" },
    companyIds: { targetCollection: "companies", targetField: "projectIds" },
    noteIds: { targetCollection: "notes", targetField: "projectIds" },
    taskIds: { targetCollection: "tasks", targetField: "projectIds" },
    meetingIds: { targetCollection: "meetings", targetField: "projectIds" },
  },
  notes: {
    relatedNoteIds: {
      targetCollection: "notes",
      targetField: "relatedNoteIds",
    },
    personIds: { targetCollection: "people", targetField: "noteIds" },
    companyIds: { targetCollection: "companies", targetField: "noteIds" },
    projectIds: { targetCollection: "projects", targetField: "noteIds" },
    taskIds: { targetCollection: "tasks", targetField: "noteIds" },
    meetingIds: { targetCollection: "meetings", targetField: "noteIds" },
  },
  tasks: {
    personIds: { targetCollection: "people", targetField: "taskIds" },
    companyIds: { targetCollection: "companies", targetField: "taskIds" },
    projectIds: { targetCollection: "projects", targetField: "taskIds" },
    noteIds: { targetCollection: "notes", targetField: "taskIds" },
    meetingIds: { targetCollection: "meetings", targetField: "taskIds" },
  },
  meetings: {
    personIds: { targetCollection: "people", targetField: "meetingIds" },
    companyIds: { targetCollection: "companies", targetField: "meetingIds" },
    projectIds: { targetCollection: "projects", targetField: "meetingIds" },
    noteIds: { targetCollection: "notes", targetField: "meetingIds" },
    taskIds: { targetCollection: "tasks", targetField: "meetingIds" },
  },
  companies: {
    personIds: { targetCollection: "people", targetField: "companyIds" },
    projectIds: { targetCollection: "projects", targetField: "companyIds" },
    noteIds: { targetCollection: "notes", targetField: "companyIds" },
    taskIds: { targetCollection: "tasks", targetField: "companyIds" },
    meetingIds: { targetCollection: "meetings", targetField: "companyIds" },
  },
  people: {
    companyIds: { targetCollection: "companies", targetField: "personIds" },
    projectIds: { targetCollection: "projects", targetField: "personIds" },
    noteIds: { targetCollection: "notes", targetField: "personIds" },
    taskIds: { targetCollection: "tasks", targetField: "personIds" },
    meetingIds: { targetCollection: "meetings", targetField: "personIds" },
  },
};

function uniqueEntityIds(values: EntityId[]): EntityId[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function chunkArray<T>(values: T[], size: number): T[][] {
  if (values.length === 0) {
    return [];
  }

  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

class FirestoreRelationalDataModule<
  TCollection extends EntityCollectionName,
  TCreate extends object,
  TUpdate extends object,
> {
  protected readonly db: Firestore;
  protected readonly uid: string;
  protected readonly collectionName: TCollection;
  protected readonly idPrefix: string;
  protected readonly relationDefaults: RelationArrays<
    CollectionEntityMap[TCollection]
  >;

  constructor(
    db: Firestore,
    uid: string,
    collectionName: TCollection,
    idPrefix: string,
    relationDefaults: RelationArrays<CollectionEntityMap[TCollection]>,
  ) {
    this.db = db;
    this.uid = uid;
    this.collectionName = collectionName;
    this.idPrefix = idPrefix;
    this.relationDefaults = relationDefaults;
  }

  protected collectionRef() {
    return collection(this.db, "users", this.uid, this.collectionName);
  }

  protected docRef(id: EntityId) {
    return doc(this.collectionRef(), id);
  }

  async list(): Promise<CollectionEntityMap[TCollection][]> {
    const snapshot = await getDocs(this.collectionRef());
    return snapshot.docs.map(
      (record) => record.data() as CollectionEntityMap[TCollection],
    );
  }

  async listByIds(
    ids: EntityId[],
  ): Promise<CollectionEntityMap[TCollection][]> {
    const normalizedIds = uniqueEntityIds(ids);
    if (normalizedIds.length === 0) {
      return [];
    }

    const chunks = chunkArray(normalizedIds, 10);
    const allSnapshots = await Promise.all(
      chunks.map((idChunk) =>
        getDocs(
          query(this.collectionRef(), where(documentId(), "in", idChunk)),
        ),
      ),
    );

    return allSnapshots.flatMap((snapshot) =>
      snapshot.docs.map(
        (record) => record.data() as CollectionEntityMap[TCollection],
      ),
    );
  }

  async getById(
    id: EntityId,
  ): Promise<CollectionEntityMap[TCollection] | null> {
    const record = await getDoc(this.docRef(id));
    if (!record.exists()) {
      return null;
    }

    return record.data() as CollectionEntityMap[TCollection];
  }

  async create(input: TCreate): Promise<CollectionEntityMap[TCollection]> {
    const timestamp = nowIsoDate();
    const entity = {
      ...this.relationDefaults,
      ...(input as object),
      id: createEntityId(this.idPrefix),
      createdAt: timestamp,
      updatedAt: timestamp,
    } as CollectionEntityMap[TCollection];

    const normalized = this.normalizeRelations(entity);
    await setDoc(this.docRef(normalized.id), normalized);
    await this.syncBidirectionalRelations(normalized, null);
    return normalized;
  }

  async update(
    id: EntityId,
    input: TUpdate,
  ): Promise<CollectionEntityMap[TCollection] | null> {
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      ...(input as object),
      updatedAt: nowIsoDate(),
    } as CollectionEntityMap[TCollection];

    const normalized = this.normalizeRelations(updated);
    await setDoc(this.docRef(id), normalized);
    await this.syncBidirectionalRelations(normalized, existing);
    return normalized;
  }

  async delete(id: EntityId): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) {
      return false;
    }

    await deleteDoc(this.docRef(id));
    await this.detachRelationsForDeletedEntity(existing);
    await this.removeInboundRelationsToDeletedEntity(id);
    return true;
  }

  async listByRelation(
    relationField: RelationField<CollectionEntityMap[TCollection]>,
    relatedId: EntityId,
  ): Promise<CollectionEntityMap[TCollection][]> {
    const relationQuery = query(
      this.collectionRef(),
      where(relationField as string, "array-contains", relatedId),
    );
    const snapshot = await getDocs(relationQuery);

    return snapshot.docs.map(
      (record) => record.data() as CollectionEntityMap[TCollection],
    );
  }

  private getRelationFields(): string[] {
    return Object.keys(this.relationDefaults);
  }

  private normalizeRelations(
    entity: CollectionEntityMap[TCollection],
  ): CollectionEntityMap[TCollection] {
    const normalized = {
      ...entity,
    } as CollectionEntityMap[TCollection] & Record<string, unknown>;

    this.getRelationFields().forEach((field) => {
      const current = normalized[field];
      normalized[field] = Array.isArray(current)
        ? uniqueEntityIds(current as EntityId[])
        : [];
    });

    return normalized as CollectionEntityMap[TCollection];
  }

  private readRelationIds(entity: unknown, field: string): EntityId[] {
    if (!entity || typeof entity !== "object") {
      return [];
    }

    const record = entity as Record<string, unknown>;
    const value = record[field];
    return Array.isArray(value) ? (value as EntityId[]) : [];
  }

  private async syncBidirectionalRelations(
    nextEntity: CollectionEntityMap[TCollection],
    previousEntity: CollectionEntityMap[TCollection] | null,
  ): Promise<void> {
    const collectionConfig = RELATION_CONFIG[this.collectionName];

    await Promise.all(
      this.getRelationFields().map(async (field) => {
        const config = collectionConfig[field];
        if (!config) {
          return;
        }

        const previousIds = uniqueEntityIds(
          this.readRelationIds(previousEntity, field),
        );
        const nextIds = uniqueEntityIds(
          this.readRelationIds(nextEntity, field),
        );

        const previousSet = new Set(previousIds);
        const nextSet = new Set(nextIds);

        const removedIds = previousIds.filter((id) => !nextSet.has(id));
        const addedIds = nextIds.filter((id) => !previousSet.has(id));

        await Promise.all([
          ...addedIds.map((relatedId) =>
            this.linkReverse(config, relatedId, nextEntity.id),
          ),
          ...removedIds.map((relatedId) =>
            this.unlinkReverse(config, relatedId, nextEntity.id),
          ),
        ]);
      }),
    );
  }

  private async linkReverse(
    config: RelationConfig,
    relatedId: EntityId,
    sourceId: EntityId,
  ): Promise<void> {
    const targetRef = doc(
      collection(this.db, "users", this.uid, config.targetCollection),
      relatedId,
    );

    try {
      await updateDoc(targetRef, {
        [config.targetField]: arrayUnion(sourceId),
        updatedAt: nowIsoDate(),
      });
    } catch {
      // Target may not exist yet; ignore in first pass.
    }
  }

  private async unlinkReverse(
    config: RelationConfig,
    relatedId: EntityId,
    sourceId: EntityId,
  ): Promise<void> {
    const targetRef = doc(
      collection(this.db, "users", this.uid, config.targetCollection),
      relatedId,
    );

    try {
      await updateDoc(targetRef, {
        [config.targetField]: arrayRemove(sourceId),
        updatedAt: nowIsoDate(),
      });
    } catch {
      // Target may not exist; ignore.
    }
  }

  private async detachRelationsForDeletedEntity(
    deletedEntity: CollectionEntityMap[TCollection],
  ): Promise<void> {
    const collectionConfig = RELATION_CONFIG[this.collectionName];

    await Promise.all(
      this.getRelationFields().map(async (field) => {
        const config = collectionConfig[field];
        if (!config) {
          return;
        }

        const relatedIds = uniqueEntityIds(
          this.readRelationIds(deletedEntity, field),
        );

        await Promise.all(
          relatedIds.map((relatedId) =>
            this.unlinkReverse(config, relatedId, deletedEntity.id),
          ),
        );
      }),
    );
  }

  private async removeInboundRelationsToDeletedEntity(
    deletedId: EntityId,
  ): Promise<void> {
    await Promise.all(
      (Object.keys(RELATION_CONFIG) as EntityCollectionName[]).map(
        async (sourceCollection) => {
          const sourceConfig = RELATION_CONFIG[sourceCollection];

          await Promise.all(
            Object.entries(sourceConfig).map(async ([sourceField, config]) => {
              if (!config || config.targetCollection !== this.collectionName) {
                return;
              }

              const sourceRef = collection(
                this.db,
                "users",
                this.uid,
                sourceCollection,
              );
              const sourceQuery = query(
                sourceRef,
                where(sourceField, "array-contains", deletedId),
              );
              const sourceSnapshot = await getDocs(sourceQuery);

              await Promise.all(
                sourceSnapshot.docs.map((row) =>
                  updateDoc(row.ref, {
                    [sourceField]: arrayRemove(deletedId),
                    updatedAt: nowIsoDate(),
                  }),
                ),
              );
            }),
          );
        },
      ),
    );
  }
}

class FirestoreProjectsDataModule
  extends FirestoreRelationalDataModule<
    "projects",
    CreateProjectInput,
    UpdateProjectInput
  >
  implements ProjectsDataModule
{
  private dataModules: Omit<DataModules, "projects"> | null = null;

  constructor(db: Firestore, uid: string) {
    super(db, uid, "projects", "project", {
      personIds: [],
      companyIds: [],
      noteIds: [],
      taskIds: [],
      meetingIds: [],
    });
  }

  setDataModules(dataModules: Omit<DataModules, "projects">): void {
    this.dataModules = dataModules;
  }

  async getAssociatedRecords(
    projectId: EntityId,
  ): Promise<ProjectAssociatedRecords | null> {
    const project = await this.getById(projectId);
    if (!project || !this.dataModules) {
      return null;
    }

    const [people, companies, notes, tasks, meetings] = await Promise.all([
      this.dataModules.people.listByIds(project.personIds),
      this.dataModules.companies.listByIds(project.companyIds),
      this.dataModules.notes.listByIds(project.noteIds),
      this.dataModules.tasks.listByIds(project.taskIds),
      this.dataModules.meetings.listByIds(project.meetingIds),
    ]);

    return {
      project,
      people,
      companies,
      notes,
      tasks,
      meetings,
    };
  }
}

class FirestoreNotesDataModule
  extends FirestoreRelationalDataModule<
    "notes",
    CreateNoteInput,
    UpdateNoteInput
  >
  implements NotesDataModule
{
  private dataModules: Omit<DataModules, "notes"> | null = null;

  constructor(db: Firestore, uid: string) {
    super(db, uid, "notes", "note", {
      relatedNoteIds: [],
      personIds: [],
      companyIds: [],
      projectIds: [],
      taskIds: [],
      meetingIds: [],
    });
  }

  setDataModules(dataModules: Omit<DataModules, "notes">): void {
    this.dataModules = dataModules;
  }

  async getAssociatedRecords(
    noteId: EntityId,
  ): Promise<NoteAssociatedRecords | null> {
    const note = await this.getById(noteId);
    if (!note || !this.dataModules) {
      return null;
    }

    const [people, companies, projects, tasks, meetings] = await Promise.all([
      this.dataModules.people.listByIds(note.personIds),
      this.dataModules.companies.listByIds(note.companyIds),
      this.dataModules.projects.listByIds(note.projectIds),
      this.dataModules.tasks.listByIds(note.taskIds),
      this.dataModules.meetings.listByIds(note.meetingIds),
    ]);

    return {
      note,
      people,
      companies,
      projects,
      tasks,
      meetings,
    };
  }
}

class FirestoreTasksDataModule
  extends FirestoreRelationalDataModule<
    "tasks",
    CreateTaskInput,
    UpdateTaskInput
  >
  implements TasksDataModule
{
  private dataModules: Omit<DataModules, "tasks"> | null = null;

  constructor(db: Firestore, uid: string) {
    super(db, uid, "tasks", "task", {
      personIds: [],
      companyIds: [],
      projectIds: [],
      noteIds: [],
      meetingIds: [],
    });
  }

  setDataModules(dataModules: Omit<DataModules, "tasks">): void {
    this.dataModules = dataModules;
  }

  async getAssociatedRecords(
    taskId: EntityId,
  ): Promise<TaskAssociatedRecords | null> {
    const task = await this.getById(taskId);
    if (!task || !this.dataModules) {
      return null;
    }

    const [people, companies, projects, notes, meetings] = await Promise.all([
      this.dataModules.people.listByIds(task.personIds),
      this.dataModules.companies.listByIds(task.companyIds),
      this.dataModules.projects.listByIds(task.projectIds),
      this.dataModules.notes.listByIds(task.noteIds),
      this.dataModules.meetings.listByIds(task.meetingIds),
    ]);

    return {
      task,
      people,
      companies,
      projects,
      notes,
      meetings,
    };
  }
}

class FirestoreMeetingsDataModule
  extends FirestoreRelationalDataModule<
    "meetings",
    CreateMeetingInput,
    UpdateMeetingInput
  >
  implements MeetingsDataModule
{
  private dataModules: Omit<DataModules, "meetings"> | null = null;

  constructor(db: Firestore, uid: string) {
    super(db, uid, "meetings", "meeting", {
      personIds: [],
      companyIds: [],
      projectIds: [],
      noteIds: [],
      taskIds: [],
    });
  }

  setDataModules(dataModules: Omit<DataModules, "meetings">): void {
    this.dataModules = dataModules;
  }

  async getAssociatedRecords(
    meetingId: EntityId,
  ): Promise<MeetingAssociatedRecords | null> {
    const meeting = await this.getById(meetingId);
    if (!meeting || !this.dataModules) {
      return null;
    }

    const [people, companies, projects, notes, tasks] = await Promise.all([
      this.dataModules.people.listByIds(meeting.personIds),
      this.dataModules.companies.listByIds(meeting.companyIds),
      this.dataModules.projects.listByIds(meeting.projectIds),
      this.dataModules.notes.listByIds(meeting.noteIds),
      this.dataModules.tasks.listByIds(meeting.taskIds),
    ]);

    return {
      meeting,
      people,
      companies,
      projects,
      notes,
      tasks,
    };
  }
}

class FirestoreCompaniesDataModule
  extends FirestoreRelationalDataModule<
    "companies",
    CreateCompanyInput,
    UpdateCompanyInput
  >
  implements CompaniesDataModule
{
  private dataModules: Omit<DataModules, "companies"> | null = null;

  constructor(db: Firestore, uid: string) {
    super(db, uid, "companies", "company", {
      personIds: [],
      projectIds: [],
      noteIds: [],
      taskIds: [],
      meetingIds: [],
    });
  }

  setDataModules(dataModules: Omit<DataModules, "companies">): void {
    this.dataModules = dataModules;
  }

  async getAssociatedRecords(
    companyId: EntityId,
  ): Promise<CompanyAssociatedRecords | null> {
    const company = await this.getById(companyId);
    if (!company || !this.dataModules) {
      return null;
    }

    const [people, projects, notes, tasks, meetings] = await Promise.all([
      this.dataModules.people.listByIds(company.personIds),
      this.dataModules.projects.listByIds(company.projectIds),
      this.dataModules.notes.listByIds(company.noteIds),
      this.dataModules.tasks.listByIds(company.taskIds),
      this.dataModules.meetings.listByIds(company.meetingIds),
    ]);

    return {
      company,
      people,
      projects,
      notes,
      tasks,
      meetings,
    };
  }
}

class FirestorePeopleDataModule
  extends FirestoreRelationalDataModule<
    "people",
    CreatePersonInput,
    UpdatePersonInput
  >
  implements PeopleDataModule
{
  private dataModules: Omit<DataModules, "people"> | null = null;

  constructor(db: Firestore, uid: string) {
    super(db, uid, "people", "person", {
      companyIds: [],
      projectIds: [],
      noteIds: [],
      taskIds: [],
      meetingIds: [],
    });
  }

  setDataModules(dataModules: Omit<DataModules, "people">): void {
    this.dataModules = dataModules;
  }

  async getAssociatedRecords(personId: EntityId) {
    const person = await this.getById(personId);
    if (!person || !this.dataModules) {
      return null;
    }

    const [projects, notes, tasks, meetings, companies] = await Promise.all([
      this.dataModules.projects.listByIds(person.projectIds),
      this.dataModules.notes.listByIds(person.noteIds),
      this.dataModules.tasks.listByIds(person.taskIds),
      this.dataModules.meetings.listByIds(person.meetingIds),
      this.dataModules.companies.listByIds(person.companyIds),
    ]);

    return {
      person,
      projects,
      notes,
      tasks,
      meetings,
      companies,
    };
  }
}

export function createFirestoreDataModules(
  db: Firestore,
  uid: string,
): DataModules {
  const projects = new FirestoreProjectsDataModule(db, uid);
  const notes = new FirestoreNotesDataModule(db, uid);
  const tasks = new FirestoreTasksDataModule(db, uid);
  const meetings = new FirestoreMeetingsDataModule(db, uid);
  const companies = new FirestoreCompaniesDataModule(db, uid);
  const people = new FirestorePeopleDataModule(db, uid);

  projects.setDataModules({ notes, tasks, meetings, companies, people });
  notes.setDataModules({ projects, tasks, meetings, companies, people });
  tasks.setDataModules({ projects, notes, meetings, companies, people });
  meetings.setDataModules({ projects, notes, tasks, companies, people });
  companies.setDataModules({ projects, notes, tasks, meetings, people });
  people.setDataModules({ projects, notes, tasks, meetings, companies });

  return {
    projects,
    notes,
    tasks,
    meetings,
    companies,
    people,
  };
}
