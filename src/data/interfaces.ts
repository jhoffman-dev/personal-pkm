import type {
  Company,
  CreateCompanyInput,
  CreateMeetingInput,
  CreateNoteInput,
  CreatePersonInput,
  CreateProjectInput,
  CreateTaskInput,
  Meeting,
  Note,
  Person,
  Project,
  Task,
  UpdateCompanyInput,
  UpdateMeetingInput,
  UpdateNoteInput,
  UpdatePersonInput,
  UpdateProjectInput,
  UpdateTaskInput,
} from "@/data/entities";
import type { EntityId, RelationField } from "@/data/types";

/**
 * Generic asynchronous CRUD contract for entity modules.
 *
 * Invariants:
 * - `create` returns the persisted entity with a stable `id`.
 * - `update` returns `null` when the entity does not exist.
 * - `delete` returns `false` when the entity does not exist.
 */
export interface CrudDataModule<TEntity, TCreate, TUpdate> {
  list(): Promise<TEntity[]>;
  listByIds(ids: EntityId[]): Promise<TEntity[]>;
  getById(id: EntityId): Promise<TEntity | null>;
  create(input: TCreate): Promise<TEntity>;
  update(id: EntityId, input: TUpdate): Promise<TEntity | null>;
  delete(id: EntityId): Promise<boolean>;
}

/**
 * CRUD contract with additional relation-based filtering support.
 *
 * Constraint:
 * - `relationField` must be a valid relation key for `TEntity`.
 */
export interface RelationalDataModule<
  TEntity,
  TCreate,
  TUpdate,
> extends CrudDataModule<TEntity, TCreate, TUpdate> {
  listByRelation(
    relationField: RelationField<TEntity>,
    relatedId: EntityId,
  ): Promise<TEntity[]>;
}

/** Project data contract with associated-entity hydration. */
export interface ProjectsDataModule extends RelationalDataModule<
  Project,
  CreateProjectInput,
  UpdateProjectInput
> {
  getAssociatedRecords(
    projectId: EntityId,
  ): Promise<ProjectAssociatedRecords | null>;
}

/** Note data contract with associated-entity hydration. */
export interface NotesDataModule extends RelationalDataModule<
  Note,
  CreateNoteInput,
  UpdateNoteInput
> {
  getAssociatedRecords(noteId: EntityId): Promise<NoteAssociatedRecords | null>;
}

/** Task data contract with associated-entity hydration. */
export interface TasksDataModule extends RelationalDataModule<
  Task,
  CreateTaskInput,
  UpdateTaskInput
> {
  getAssociatedRecords(taskId: EntityId): Promise<TaskAssociatedRecords | null>;
}

/** Meeting data contract with associated-entity hydration. */
export interface MeetingsDataModule extends RelationalDataModule<
  Meeting,
  CreateMeetingInput,
  UpdateMeetingInput
> {
  getAssociatedRecords(
    meetingId: EntityId,
  ): Promise<MeetingAssociatedRecords | null>;
}

/** Company data contract with associated-entity hydration. */
export interface CompaniesDataModule extends RelationalDataModule<
  Company,
  CreateCompanyInput,
  UpdateCompanyInput
> {
  getAssociatedRecords(
    companyId: EntityId,
  ): Promise<CompanyAssociatedRecords | null>;
}

/**
 * Aggregated records related to a single project.
 *
 * Constraint:
 * - `project.id` is the source anchor for all related collections.
 */
export interface ProjectAssociatedRecords {
  project: Project;
  people: Person[];
  companies: Company[];
  notes: Note[];
  tasks: Task[];
  meetings: Meeting[];
}

/** Aggregated records related to a single note. */
export interface NoteAssociatedRecords {
  note: Note;
  people: Person[];
  companies: Company[];
  projects: Project[];
  tasks: Task[];
  meetings: Meeting[];
}

/** Aggregated records related to a single task. */
export interface TaskAssociatedRecords {
  task: Task;
  people: Person[];
  companies: Company[];
  projects: Project[];
  notes: Note[];
  meetings: Meeting[];
}

/** Aggregated records related to a single meeting. */
export interface MeetingAssociatedRecords {
  meeting: Meeting;
  people: Person[];
  companies: Company[];
  projects: Project[];
  notes: Note[];
  tasks: Task[];
}

/** Aggregated records related to a single company. */
export interface CompanyAssociatedRecords {
  company: Company;
  people: Person[];
  projects: Project[];
  notes: Note[];
  tasks: Task[];
  meetings: Meeting[];
}

/** Aggregated records related to a single person. */
export interface PersonAssociatedRecords {
  person: Person;
  projects: Project[];
  notes: Note[];
  tasks: Task[];
  meetings: Meeting[];
  companies: Company[];
}

/** Person data contract with associated-entity hydration. */
export interface PeopleDataModule extends RelationalDataModule<
  Person,
  CreatePersonInput,
  UpdatePersonInput
> {
  getAssociatedRecords(
    personId: EntityId,
  ): Promise<PersonAssociatedRecords | null>;
}

/**
 * Root contract aggregating all entity data modules.
 *
 * Constraint:
 * - All modules should share consistent not-found semantics from `CrudDataModule`.
 */
export interface DataModules {
  projects: ProjectsDataModule;
  notes: NotesDataModule;
  tasks: TasksDataModule;
  meetings: MeetingsDataModule;
  companies: CompaniesDataModule;
  people: PeopleDataModule;
}
