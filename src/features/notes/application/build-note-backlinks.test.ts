import type {
  Company,
  Meeting,
  Note,
  Person,
  Project,
  Task,
} from "@/data/entities";
import { buildNoteBacklinks } from "@/features/notes/application/build-note-backlinks";
import { describe, expect, it } from "vitest";

function makeNote(overrides: Partial<Note>): Note {
  return {
    id: "n1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    title: "Note",
    body: "<p>x</p>",
    tags: [],
    relatedNoteIds: [],
    personIds: [],
    companyIds: [],
    projectIds: [],
    taskIds: [],
    meetingIds: [],
    ...overrides,
  };
}

const project: Project = {
  id: "p1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  name: "Roadmap",
  paraType: "project",
  tags: [],
  personIds: [],
  companyIds: [],
  noteIds: ["n1"],
  taskIds: [],
  meetingIds: [],
};

const task: Task = {
  id: "t1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  title: "Task",
  tags: [],
  status: "inbox",
  level: "task",
  noteIds: ["n1"],
  personIds: [],
  companyIds: [],
  projectIds: [],
  meetingIds: [],
};

const meeting: Meeting = {
  id: "m1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  title: "Sync",
  tags: [],
  scheduledFor: "2026-01-01T00:00:00.000Z",
  noteIds: ["n1"],
  personIds: [],
  companyIds: [],
  projectIds: [],
  taskIds: [],
};

const company: Company = {
  id: "c1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  name: "Acme",
  tags: [],
  noteIds: ["n1"],
  personIds: [],
  projectIds: [],
  taskIds: [],
  meetingIds: [],
};

const person: Person = {
  id: "pe1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  firstName: "Jane",
  lastName: "Doe",
  tags: [],
  noteIds: ["n1"],
  companyIds: [],
  projectIds: [],
  taskIds: [],
  meetingIds: [],
};

describe("buildNoteBacklinks", () => {
  it("returns empty backlinks when no selected note", () => {
    const result = buildNoteBacklinks({
      selectedNoteId: null,
      notes: [],
      projects: [],
      tasks: [],
      meetings: [],
      companies: [],
      people: [],
    });

    expect(result.notes).toEqual([]);
    expect(result.projects).toEqual([]);
  });

  it("builds backlinks across entity types", () => {
    const result = buildNoteBacklinks({
      selectedNoteId: "n1",
      notes: [
        makeNote({ id: "n1", title: "Selected" }),
        makeNote({ id: "n2", title: "Ref", relatedNoteIds: ["n1"] }),
      ],
      projects: [project],
      tasks: [task],
      meetings: [meeting],
      companies: [company],
      people: [person],
    });

    expect(result.notes.map((item) => item.id)).toEqual(["n2"]);
    expect(result.projects.map((item) => item.id)).toEqual(["p1"]);
    expect(result.tasks.map((item) => item.id)).toEqual(["t1"]);
    expect(result.meetings.map((item) => item.id)).toEqual(["m1"]);
    expect(result.companies.map((item) => item.id)).toEqual(["c1"]);
    expect(result.people.map((item) => item.id)).toEqual(["pe1"]);
  });
});
