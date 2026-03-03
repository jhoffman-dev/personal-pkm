import type {
  CreateCompanyInput,
  CreateMeetingInput,
  CreatePersonInput,
  UpdateCompanyInput,
  UpdateMeetingInput,
  UpdatePersonInput,
} from "@/data/entities";
import type {
  CompaniesDataModule,
  CompanyAssociatedRecords,
  DataModules,
  MeetingsDataModule,
  MeetingAssociatedRecords,
  PeopleDataModule,
} from "@/data/interfaces";
import type { EntityId } from "@/data/types";
import { FirestoreRelationalDataModule } from "@/data/firestore/firestore-relational-data-module";
import type { Firestore } from "firebase/firestore";

export class FirestoreMeetingsDataModule
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

export class FirestoreCompaniesDataModule
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

export class FirestorePeopleDataModule
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
