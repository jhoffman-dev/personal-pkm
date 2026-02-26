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
import {
  relationFieldsFromDefaults,
  uniqueEntityIds,
} from "@/data/shared/relation-domain";
import {
  applyBidirectionalRelationMutations,
  applyDetachRelationMutations,
  applyInboundCleanupSpecs,
} from "@/data/shared/relation-mutation-runner";
import { LocalRelationMutator } from "@/data/local/local-relation-mutator";
import type { CollectionEntityMap } from "@/data/local/local-nosql-store";
import { LocalNoSqlStore } from "@/data/local/local-nosql-store";

type RelationArrays<TEntity> = {
  [K in RelationField<TEntity>]?: EntityId[];
};

class LocalRelationalDataModule<
  TCollection extends EntityCollectionName,
  TCreate extends object,
  TUpdate extends object,
> {
  protected readonly store: LocalNoSqlStore;
  protected readonly collection: TCollection;
  protected readonly idPrefix: string;
  protected readonly relationMutator: LocalRelationMutator;
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
    this.relationMutator = new LocalRelationMutator(store);
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
    await this.syncBidirectionalRelations(created, null);
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
    await this.syncBidirectionalRelations(saved, existing);
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

    await this.detachRelationsForDeletedEntity(existing);
    await this.removeInboundRelationsToDeletedEntity(id);
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
    return relationFieldsFromDefaults(this.relationDefaults);
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

  private syncBidirectionalRelations(
    nextEntity: CollectionEntityMap[TCollection],
    previousEntity: CollectionEntityMap[TCollection] | null,
  ): Promise<void> {
    return applyBidirectionalRelationMutations({
      collection: this.collection,
      relationFields: this.getRelationFields(),
      nextEntity,
      previousEntity,
      onAdd: (mutation) => {
        return this.relationMutator.addReverseLink(
          mutation.config,
          mutation.relatedId,
          mutation.sourceId,
        );
      },
      onRemove: (mutation) => {
        return this.relationMutator.removeReverseLink(
          mutation.config,
          mutation.relatedId,
          mutation.sourceId,
        );
      },
    });
  }

  private detachRelationsForDeletedEntity(
    deletedEntity: CollectionEntityMap[TCollection],
  ): Promise<void> {
    return applyDetachRelationMutations({
      collection: this.collection,
      relationFields: this.getRelationFields(),
      deletedEntity,
      onRemove: (mutation) => {
        return this.relationMutator.removeReverseLink(
          mutation.config,
          mutation.relatedId,
          mutation.sourceId,
        );
      },
    });
  }

  private removeInboundRelationsToDeletedEntity(
    deletedId: EntityId,
  ): Promise<void> {
    return applyInboundCleanupSpecs({
      targetCollection: this.collection,
      onSpec: (cleanupSpec) => {
        return this.relationMutator.cleanupInboundReference(
          cleanupSpec,
          deletedId,
        );
      },
    });
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
