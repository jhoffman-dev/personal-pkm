import type {
  Company,
  Meeting,
  Note,
  Person,
  Project,
  Task,
} from "@/data/entities";
import { DEFAULT_NOTE_TITLE } from "@/lib/note-defaults";

export type BacklinkOption = {
  id: string;
  label: string;
};

export type NoteBacklinks = {
  notes: BacklinkOption[];
  projects: BacklinkOption[];
  tasks: BacklinkOption[];
  meetings: BacklinkOption[];
  companies: BacklinkOption[];
  people: BacklinkOption[];
};

const EMPTY_BACKLINKS: NoteBacklinks = {
  notes: [],
  projects: [],
  tasks: [],
  meetings: [],
  companies: [],
  people: [],
};

export function buildNoteBacklinks(params: {
  selectedNoteId: string | null;
  notes: Note[];
  projects: Project[];
  tasks: Task[];
  meetings: Meeting[];
  companies: Company[];
  people: Person[];
}): NoteBacklinks {
  if (!params.selectedNoteId) {
    return EMPTY_BACKLINKS;
  }

  const selectedId = params.selectedNoteId;

  return {
    notes: params.notes
      .filter(
        (note) =>
          note.id !== selectedId &&
          (note.relatedNoteIds ?? []).includes(selectedId),
      )
      .map((note) => ({
        id: note.id,
        label: note.title || DEFAULT_NOTE_TITLE,
      })),
    projects: params.projects
      .filter((project) => project.noteIds.includes(selectedId))
      .map((project) => ({ id: project.id, label: project.name })),
    tasks: params.tasks
      .filter((task) => task.noteIds.includes(selectedId))
      .map((task) => ({ id: task.id, label: task.title })),
    meetings: params.meetings
      .filter((meeting) => meeting.noteIds.includes(selectedId))
      .map((meeting) => ({ id: meeting.id, label: meeting.title })),
    companies: params.companies
      .filter((company) => company.noteIds.includes(selectedId))
      .map((company) => ({ id: company.id, label: company.name })),
    people: params.people
      .filter((person) => person.noteIds.includes(selectedId))
      .map((person) => ({
        id: person.id,
        label: `${person.firstName} ${person.lastName}`.trim(),
      })),
  };
}
