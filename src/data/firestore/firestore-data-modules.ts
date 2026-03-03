import type { DataModules } from "@/data/interfaces";
import {
  FirestoreNotesDataModule,
  FirestoreProjectsDataModule,
  FirestoreTasksDataModule,
} from "@/data/firestore/firestore-feature-data-modules-a";
import {
  FirestoreCompaniesDataModule,
  FirestoreMeetingsDataModule,
  FirestorePeopleDataModule,
} from "@/data/firestore/firestore-feature-data-modules-b";
import type { Firestore } from "firebase/firestore";

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
