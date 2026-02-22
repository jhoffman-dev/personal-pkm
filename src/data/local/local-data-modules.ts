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
import type {
  EntityCollectionName,
  EntityId,
  RelationField,
} from "@/data/types";
import { createEntityId, nowIsoDate } from "@/data/types";
import type { CollectionEntityMap } from "@/data/local/local-nosql-store";
import { LocalNoSqlStore } from "@/data/local/local-nosql-store";

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

class LocalRelationalDataModule<
  TCollection extends EntityCollectionName,
  TCreate extends object,
  TUpdate extends object,
> {
  protected readonly store: LocalNoSqlStore;
  protected readonly collection: TCollection;
  protected readonly idPrefix: string;
  protected readonly relationDefaults: RelationArrays<
    CollectionEntityMap[TCollection]
  >;

  constructor(
    store: LocalNoSqlStore,
    collection: TCollection,
    idPrefix: string,
    relationDefaults: RelationArrays<CollectionEntityMap[TCollection]>,
  ) {
    this.store = store;
    this.collection = collection;
    this.idPrefix = idPrefix;
    this.relationDefaults = relationDefaults;
  }

  async list(): Promise<CollectionEntityMap[TCollection][]> {
    return this.store.getAll(this.collection);
  }

  async listByIds(
    ids: EntityId[],
  ): Promise<CollectionEntityMap[TCollection][]> {
    if (ids.length === 0) {
      return [];
    }

    const idSet = new Set(ids);
    const rows = await this.list();
    return rows.filter((row) => idSet.has(row.id));
  }

  async getById(
    id: EntityId,
  ): Promise<CollectionEntityMap[TCollection] | null> {
    return this.store.getById(this.collection, id);
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
    const created = this.store.set(this.collection, normalized);
    this.syncBidirectionalRelations(created, null);
    return created;
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
    const saved = this.store.set(this.collection, normalized);
    this.syncBidirectionalRelations(saved, existing);
    return saved;
  }

  async delete(id: EntityId): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) {
      return false;
    }

    const deleted = this.store.delete(this.collection, id);
    if (!deleted) {
      return false;
    }

    this.detachRelationsForDeletedEntity(existing);
    this.removeInboundRelationsToDeletedEntity(id);
    return true;
  }

  async listByRelation(
    relationField: RelationField<CollectionEntityMap[TCollection]>,
    relatedId: EntityId,
  ): Promise<CollectionEntityMap[TCollection][]> {
    const rows = await this.list();
    return rows.filter((row) => {
      const relation = row[relationField] as unknown;
      if (!Array.isArray(relation)) {
        return false;
      }
      return relation.includes(relatedId);
    });
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

  private syncBidirectionalRelations(
    nextEntity: CollectionEntityMap[TCollection],
    previousEntity: CollectionEntityMap[TCollection] | null,
  ): void {
    const collectionConfig = RELATION_CONFIG[this.collection];
    const relationFields = this.getRelationFields();

    relationFields.forEach((field) => {
      const config = collectionConfig[field];
      if (!config) {
        return;
      }

      const previousIds = uniqueEntityIds(
        this.readRelationIds(previousEntity, field),
      );
      const nextIds = uniqueEntityIds(this.readRelationIds(nextEntity, field));

      const previousSet = new Set(previousIds);
      const nextSet = new Set(nextIds);

      const removedIds = previousIds.filter((id) => !nextSet.has(id));
      const addedIds = nextIds.filter((id) => !previousSet.has(id));

      addedIds.forEach((relatedId) => {
        this.linkReverse(config, relatedId, nextEntity.id);
      });

      removedIds.forEach((relatedId) => {
        this.unlinkReverse(config, relatedId, nextEntity.id);
      });
    });
  }

  private linkReverse(
    config: RelationConfig,
    relatedId: EntityId,
    sourceId: EntityId,
  ): void {
    const related = this.store.getById(config.targetCollection, relatedId) as
      | (CollectionEntityMap[typeof config.targetCollection] &
          Record<string, unknown>)
      | null;

    if (!related) {
      return;
    }

    const currentValues = Array.isArray(related[config.targetField])
      ? (related[config.targetField] as EntityId[])
      : [];

    if (currentValues.includes(sourceId)) {
      return;
    }

    const updated = {
      ...related,
      [config.targetField]: [...currentValues, sourceId],
      updatedAt: nowIsoDate(),
    } as CollectionEntityMap[typeof config.targetCollection];

    this.store.set(config.targetCollection, updated);
  }

  private unlinkReverse(
    config: RelationConfig,
    relatedId: EntityId,
    sourceId: EntityId,
  ): void {
    const related = this.store.getById(config.targetCollection, relatedId) as
      | (CollectionEntityMap[typeof config.targetCollection] &
          Record<string, unknown>)
      | null;

    if (!related) {
      return;
    }

    const currentValues = Array.isArray(related[config.targetField])
      ? (related[config.targetField] as EntityId[])
      : [];

    if (!currentValues.includes(sourceId)) {
      return;
    }

    const updated = {
      ...related,
      [config.targetField]: currentValues.filter((value) => value !== sourceId),
      updatedAt: nowIsoDate(),
    } as CollectionEntityMap[typeof config.targetCollection];

    this.store.set(config.targetCollection, updated);
  }

  private detachRelationsForDeletedEntity(
    deletedEntity: CollectionEntityMap[TCollection],
  ): void {
    const collectionConfig = RELATION_CONFIG[this.collection];

    this.getRelationFields().forEach((field) => {
      const config = collectionConfig[field];
      if (!config) {
        return;
      }

      const relatedIds = uniqueEntityIds(
        this.readRelationIds(deletedEntity, field),
      );

      relatedIds.forEach((relatedId) => {
        this.unlinkReverse(config, relatedId, deletedEntity.id);
      });
    });
  }

  private removeInboundRelationsToDeletedEntity(deletedId: EntityId): void {
    (Object.keys(RELATION_CONFIG) as EntityCollectionName[]).forEach(
      (sourceCollection) => {
        const sourceConfig = RELATION_CONFIG[sourceCollection];
        const sourceRows = this.store.getAll(
          sourceCollection,
        ) as (CollectionEntityMap[typeof sourceCollection] &
          Record<string, unknown>)[];

        Object.entries(sourceConfig).forEach(([sourceField, config]) => {
          if (!config || config.targetCollection !== this.collection) {
            return;
          }

          sourceRows.forEach((row) => {
            const current = Array.isArray(row[sourceField])
              ? (row[sourceField] as EntityId[])
              : [];

            if (!current.includes(deletedId)) {
              return;
            }

            const updated = {
              ...row,
              [sourceField]: current.filter((id) => id !== deletedId),
              updatedAt: nowIsoDate(),
            } as CollectionEntityMap[typeof sourceCollection];

            this.store.set(sourceCollection, updated);
          });
        });
      },
    );
  }
}

class LocalProjectsDataModule
  extends LocalRelationalDataModule<
    "projects",
    CreateProjectInput,
    UpdateProjectInput
  >
  implements ProjectsDataModule
{
  private dataModules: Omit<DataModules, "projects"> | null = null;

  constructor(store: LocalNoSqlStore) {
    super(store, "projects", "project", {
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

class LocalNotesDataModule
  extends LocalRelationalDataModule<"notes", CreateNoteInput, UpdateNoteInput>
  implements NotesDataModule
{
  private dataModules: Omit<DataModules, "notes"> | null = null;

  constructor(store: LocalNoSqlStore) {
    super(store, "notes", "note", {
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

class LocalTasksDataModule
  extends LocalRelationalDataModule<"tasks", CreateTaskInput, UpdateTaskInput>
  implements TasksDataModule
{
  private dataModules: Omit<DataModules, "tasks"> | null = null;

  constructor(store: LocalNoSqlStore) {
    super(store, "tasks", "task", {
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

class LocalMeetingsDataModule
  extends LocalRelationalDataModule<
    "meetings",
    CreateMeetingInput,
    UpdateMeetingInput
  >
  implements MeetingsDataModule
{
  private dataModules: Omit<DataModules, "meetings"> | null = null;

  constructor(store: LocalNoSqlStore) {
    super(store, "meetings", "meeting", {
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

class LocalCompaniesDataModule
  extends LocalRelationalDataModule<
    "companies",
    CreateCompanyInput,
    UpdateCompanyInput
  >
  implements CompaniesDataModule
{
  private dataModules: Omit<DataModules, "companies"> | null = null;

  constructor(store: LocalNoSqlStore) {
    super(store, "companies", "company", {
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

class LocalPeopleDataModule
  extends LocalRelationalDataModule<
    "people",
    CreatePersonInput,
    UpdatePersonInput
  >
  implements PeopleDataModule
{
  private dataModules: Omit<DataModules, "people"> | null = null;

  constructor(store: LocalNoSqlStore) {
    super(store, "people", "person", {
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

export function createLocalDataModules(
  store = new LocalNoSqlStore(),
): DataModules {
  const projects = new LocalProjectsDataModule(store);
  const notes = new LocalNotesDataModule(store);
  const tasks = new LocalTasksDataModule(store);
  const meetings = new LocalMeetingsDataModule(store);
  const companies = new LocalCompaniesDataModule(store);
  const people = new LocalPeopleDataModule(store);

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
