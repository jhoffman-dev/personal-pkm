import type { Note } from "@/data/entities";
import { buildSharedTagSuggestions } from "@/features/tasks/application/build-shared-tag-suggestions";
import { buildQuickPersonCreateInput } from "@/features/tasks/application/build-quick-create-inputs";
import {
  buildQuickMeetingCreateInput,
  buildQuickTaskCreateInput,
  buildStoryCreateInput,
} from "@/features/tasks/application/build-quick-create-inputs";
import { buildTaskDetailsUpdateInput } from "@/features/tasks/application/build-task-details-update-input";
import {
  buildMainTaskNoteUpdateInput,
  planTaskTimeblockSync,
} from "@/features/tasks/application/task-side-effect-plans";
import {
  mergeMainNoteId,
  resolveMainTaskTitle,
  selectMainTaskNote,
} from "@/features/tasks/application/main-task-note-flow";
import { appendUniqueTag } from "@/features/tasks/application/tag-input-helpers";
import { resolveMainTaskNote } from "@/features/tasks/application/resolve-main-task-note";
import { describe, expect, it } from "vitest";

function makeNote(overrides: Partial<Note>): Note {
  return {
    id: "n0",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    title: "Note",
    body: "<p>Body</p>",
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

describe("tasks page helpers", () => {
  it("builds sorted unique tag suggestions", () => {
    const result = buildSharedTagSuggestions([
      [{ tags: [" urgent ", "planning"] }],
      [{ tags: ["planning", ""] }],
      [{ tags: ["alpha"] }],
    ]);

    expect(result).toEqual(["alpha", "planning", "urgent"]);
  });

  it("resolves main note preferring linked title match", () => {
    const byId: Record<string, Note> = {
      n1: makeNote({
        id: "n1",
        title: "Task A",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
      n2: makeNote({
        id: "n2",
        title: "Other",
        updatedAt: "2026-03-01T00:00:00.000Z",
      }),
      n3: makeNote({
        id: "n3",
        title: "Task A",
        updatedAt: "2026-02-01T00:00:00.000Z",
      }),
    };

    const resolved = resolveMainTaskNote({
      currentTitle: "Task A",
      linkedNoteIds: ["n2", "n1"],
      noteById: byId,
      allNoteIds: ["n1", "n2", "n3"],
    });

    expect(resolved?.id).toBe("n1");
  });

  it("falls back to newest global title match", () => {
    const byId: Record<string, Note> = {
      n1: makeNote({
        id: "n1",
        title: "Task A",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
      n2: makeNote({
        id: "n2",
        title: "Task A",
        updatedAt: "2026-04-01T00:00:00.000Z",
      }),
    };

    const resolved = resolveMainTaskNote({
      currentTitle: "Task A",
      linkedNoteIds: [],
      noteById: byId,
      allNoteIds: ["n1", "n2"],
    });

    expect(resolved?.id).toBe("n2");
  });

  it("builds task details update input with due date conversion", () => {
    const result = buildTaskDetailsUpdateInput({
      title: "",
      description: "Desc",
      tags: ["alpha"],
      status: "in_progress",
      dueDate: "2026-02-01",
      noteIds: ["n1"],
      projectIds: ["p1"],
      personIds: ["pe1"],
      companyIds: ["c1"],
      meetingIds: ["m1"],
    });

    expect(result.title).toBe("Untitled task");
    expect(result.dueDate).toBe(new Date("2026-02-01").toISOString());
    expect(result.status).toBe("in_progress");
  });

  it("builds story and quick-create defaults", () => {
    const storyInput = buildStoryCreateInput({
      title: "",
      selectedProjectId: "p1",
    });

    expect(storyInput.title).toBe("New story");
    expect(storyInput.level).toBe("story");
    expect(storyInput.projectIds).toEqual(["p1"]);

    const personInput = buildQuickPersonCreateInput("Jane Doe");
    expect(personInput.firstName).toBe("Jane");
    expect(personInput.lastName).toBe("Doe");

    const meetingInput = buildQuickMeetingCreateInput(
      "",
      "2026-05-01T10:00:00.000Z",
    );
    expect(meetingInput.title).toBe("New meeting");
    expect(meetingInput.scheduledFor).toBe("2026-05-01T10:00:00.000Z");

    const taskInput = buildQuickTaskCreateInput("");
    expect(taskInput.title).toBe("New task");
    expect(taskInput.status).toBe("inbox");
  });

  it("plans task timeblock sync for upsert and removal", () => {
    const upsertPlan = planTaskTimeblockSync({
      taskId: "t1",
      startIso: "2026-02-01T10:00:00.000Z",
      endIso: "2026-02-01T11:00:00.000Z",
      currentMap: {},
    });

    expect(upsertPlan?.dueDate).toBe("2026-02-01T10:00:00.000Z");
    expect(upsertPlan?.nextMap.t1?.end).toBe("2026-02-01T11:00:00.000Z");

    const removePlan = planTaskTimeblockSync({
      taskId: "t1",
      startIso: null,
      endIso: null,
      currentMap: {
        t1: {
          start: "2026-02-01T10:00:00.000Z",
          end: "2026-02-01T11:00:00.000Z",
        },
      },
    });

    expect(removePlan?.dueDate).toBeNull();
    expect(removePlan?.nextMap.t1).toBeUndefined();
  });

  it("builds main task note update only when changed", () => {
    const note = makeNote({ title: "Task A", body: "<p>A</p>" });

    expect(
      buildMainTaskNoteUpdateInput({
        note,
        title: "Task A",
        body: "<p>A</p>",
      }),
    ).toBeNull();

    expect(
      buildMainTaskNoteUpdateInput({
        note,
        title: "Task A+",
        body: "<p>A</p>",
      }),
    ).toEqual({
      title: "Task A+",
      body: "<p>A</p>",
    });
  });

  it("resolves and selects main task note candidates", () => {
    const byId: Record<string, Note> = {
      n1: makeNote({ id: "n1", title: "Task A" }),
      n2: makeNote({ id: "n2", title: "Other" }),
    };

    expect(
      resolveMainTaskTitle({
        draftTitle: "  ",
        fallbackTitle: "Task A",
      }),
    ).toBe("Task A");

    expect(
      selectMainTaskNote({
        mainNoteId: "n2",
        noteById: byId,
        currentTitle: "Task A",
        linkedNoteIds: ["n1"],
        allNoteIds: ["n1", "n2"],
      })?.id,
    ).toBe("n2");
  });

  it("merges main note id into linked ids only when missing", () => {
    expect(mergeMainNoteId(["n1"], "n2")).toEqual(["n1", "n2"]);
    expect(mergeMainNoteId(["n1"], "n1")).toEqual(["n1"]);
    expect(mergeMainNoteId(["n1"], null)).toEqual(["n1"]);
  });

  it("appends unique tag case-insensitively and clears input", () => {
    expect(appendUniqueTag(["Alpha"], " beta ")).toEqual({
      nextTags: ["Alpha", "beta"],
      nextTagInput: "",
    });

    expect(appendUniqueTag(["Alpha"], " alpha ")).toEqual({
      nextTags: ["Alpha"],
      nextTagInput: "",
    });
  });
});
