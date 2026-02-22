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
import type {
  CompanyAssociatedRecords,
  MeetingAssociatedRecords,
  NoteAssociatedRecords,
  PersonAssociatedRecords,
  ProjectAssociatedRecords,
  TaskAssociatedRecords,
} from "@/data/interfaces";
import { createDataModuleSlice } from "@/store/data-slice-factory";

export const projectsSlice = createDataModuleSlice<
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectAssociatedRecords
>("projects", "projects");

export const notesSlice = createDataModuleSlice<
  Note,
  CreateNoteInput,
  UpdateNoteInput,
  NoteAssociatedRecords
>("notes", "notes");

export const tasksSlice = createDataModuleSlice<
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskAssociatedRecords
>("tasks", "tasks");

export const meetingsSlice = createDataModuleSlice<
  Meeting,
  CreateMeetingInput,
  UpdateMeetingInput,
  MeetingAssociatedRecords
>("meetings", "meetings");

export const companiesSlice = createDataModuleSlice<
  Company,
  CreateCompanyInput,
  UpdateCompanyInput,
  CompanyAssociatedRecords
>("companies", "companies");

export const peopleSlice = createDataModuleSlice<
  Person,
  CreatePersonInput,
  UpdatePersonInput,
  PersonAssociatedRecords
>("people", "people");

export const dataReducers = {
  projects: projectsSlice.reducer,
  notes: notesSlice.reducer,
  tasks: tasksSlice.reducer,
  meetings: meetingsSlice.reducer,
  companies: companiesSlice.reducer,
  people: peopleSlice.reducer,
};

export const dataActions = {
  projects: projectsSlice.actions,
  notes: notesSlice.actions,
  tasks: tasksSlice.actions,
  meetings: meetingsSlice.actions,
  companies: companiesSlice.actions,
  people: peopleSlice.actions,
};

export const dataThunks = {
  projects: projectsSlice.thunks,
  notes: notesSlice.thunks,
  tasks: tasksSlice.thunks,
  meetings: meetingsSlice.thunks,
  companies: companiesSlice.thunks,
  people: peopleSlice.thunks,
};
