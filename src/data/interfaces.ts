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

export interface CrudDataModule<TEntity, TCreate, TUpdate> {
  list(): Promise<TEntity[]>;
  listByIds(ids: EntityId[]): Promise<TEntity[]>;
  getById(id: EntityId): Promise<TEntity | null>;
  create(input: TCreate): Promise<TEntity>;
  update(id: EntityId, input: TUpdate): Promise<TEntity | null>;
  delete(id: EntityId): Promise<boolean>;
}

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

export interface ProjectsDataModule extends RelationalDataModule<
  Project,
  CreateProjectInput,
  UpdateProjectInput
> {
  getAssociatedRecords(
    projectId: EntityId,
  ): Promise<ProjectAssociatedRecords | null>;
}

export interface NotesDataModule extends RelationalDataModule<
  Note,
  CreateNoteInput,
  UpdateNoteInput
> {
  getAssociatedRecords(noteId: EntityId): Promise<NoteAssociatedRecords | null>;
}

export interface TasksDataModule extends RelationalDataModule<
  Task,
  CreateTaskInput,
  UpdateTaskInput
> {
  getAssociatedRecords(taskId: EntityId): Promise<TaskAssociatedRecords | null>;
}

export interface MeetingsDataModule extends RelationalDataModule<
  Meeting,
  CreateMeetingInput,
  UpdateMeetingInput
> {
  getAssociatedRecords(
    meetingId: EntityId,
  ): Promise<MeetingAssociatedRecords | null>;
}

export interface CompaniesDataModule extends RelationalDataModule<
  Company,
  CreateCompanyInput,
  UpdateCompanyInput
> {
  getAssociatedRecords(
    companyId: EntityId,
  ): Promise<CompanyAssociatedRecords | null>;
}

export interface ProjectAssociatedRecords {
  project: Project;
  people: Person[];
  companies: Company[];
  notes: Note[];
  tasks: Task[];
  meetings: Meeting[];
}

export interface NoteAssociatedRecords {
  note: Note;
  people: Person[];
  companies: Company[];
  projects: Project[];
  tasks: Task[];
  meetings: Meeting[];
}

export interface TaskAssociatedRecords {
  task: Task;
  people: Person[];
  companies: Company[];
  projects: Project[];
  notes: Note[];
  meetings: Meeting[];
}

export interface MeetingAssociatedRecords {
  meeting: Meeting;
  people: Person[];
  companies: Company[];
  projects: Project[];
  notes: Note[];
  tasks: Task[];
}

export interface CompanyAssociatedRecords {
  company: Company;
  people: Person[];
  projects: Project[];
  notes: Note[];
  tasks: Task[];
  meetings: Meeting[];
}

export interface PersonAssociatedRecords {
  person: Person;
  projects: Project[];
  notes: Note[];
  tasks: Task[];
  meetings: Meeting[];
  companies: Company[];
}

export interface PeopleDataModule extends RelationalDataModule<
  Person,
  CreatePersonInput,
  UpdatePersonInput
> {
  getAssociatedRecords(
    personId: EntityId,
  ): Promise<PersonAssociatedRecords | null>;
}

export interface DataModules {
  projects: ProjectsDataModule;
  notes: NotesDataModule;
  tasks: TasksDataModule;
  meetings: MeetingsDataModule;
  companies: CompaniesDataModule;
  people: PeopleDataModule;
}
