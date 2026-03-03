import type {
  CreateNoteInput,
  CreateProjectInput,
  CreateTaskInput,
  UpdateNoteInput,
  UpdateProjectInput,
  UpdateTaskInput,
} from "@/data/entities";
import type {
  DataModules,
  NoteAssociatedRecords,
  NotesDataModule,
  ProjectAssociatedRecords,
  ProjectsDataModule,
  TaskAssociatedRecords,
  TasksDataModule,
} from "@/data/interfaces";
import type { EntityId } from "@/data/types";
import { FirestoreRelationalDataModule } from "@/data/firestore/firestore-relational-data-module";
import type { Firestore } from "firebase/firestore";

export class FirestoreProjectsDataModule
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

export class FirestoreNotesDataModule
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

export class FirestoreTasksDataModule
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
