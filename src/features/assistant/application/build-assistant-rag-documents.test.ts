import type {
  AssistantConversation,
  StoredAssistantState,
} from "@/lib/assistant-storage";
import type {
  Company,
  Meeting,
  Note,
  Person,
  Project,
  Task,
} from "@/data/entities";
import { buildAssistantRagDocuments } from "@/features/assistant/application/build-assistant-rag-documents";
import { describe, expect, it } from "vitest";

function emptyState(
  overrides: Partial<StoredAssistantState> = {},
): StoredAssistantState {
  return {
    activeConversationId: "c1",
    conversations: [],
    systemPrompt: "sys",
    provider: "ollama",
    model: "qwen3:8b",
    ...overrides,
  };
}

describe("buildAssistantRagDocuments", () => {
  it("builds documents from entities and excludes active chat conversation", () => {
    const project: Project = {
      id: "p1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
      name: "Roadmap",
      paraType: "project",
      description: "Plan",
      tags: ["strategy"],
      personIds: [],
      companyIds: [],
      noteIds: [],
      taskIds: [],
      meetingIds: [],
    };

    const note: Note = {
      id: "n1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
      title: "Note",
      body: "<p>Hello</p>",
      tags: [],
      relatedNoteIds: [],
      personIds: [],
      companyIds: [],
      projectIds: [],
      taskIds: [],
      meetingIds: [],
    };

    const task: Task = {
      id: "t1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
      title: "Task",
      tags: [],
      status: "next_action",
      level: "task",
      personIds: [],
      companyIds: [],
      projectIds: [],
      noteIds: [],
      meetingIds: [],
    };

    const meeting: Meeting = {
      id: "m1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
      title: "Weekly",
      tags: [],
      scheduledFor: "2026-02-01T10:00:00.000Z",
      personIds: [],
      companyIds: [],
      projectIds: [],
      noteIds: [],
      taskIds: [],
    };

    const company: Company = {
      id: "co1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
      name: "Acme",
      tags: [],
      personIds: [],
      projectIds: [],
      noteIds: [],
      taskIds: [],
      meetingIds: [],
    };

    const person: Person = {
      id: "pe1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
      firstName: "Jane",
      lastName: "Doe",
      tags: [],
      companyIds: [],
      projectIds: [],
      noteIds: [],
      taskIds: [],
      meetingIds: [],
    };

    const chat1: AssistantConversation = {
      id: "c1",
      title: "Active",
      pinned: false,
      updatedAt: "2026-02-10T00:00:00.000Z",
      messages: [{ id: "1", role: "user", content: "hi" }],
    };
    const chat2: AssistantConversation = {
      id: "c2",
      title: "Previous",
      pinned: false,
      updatedAt: "2026-02-09T00:00:00.000Z",
      messages: [{ id: "2", role: "assistant", content: "hello" }],
    };

    const docs = buildAssistantRagDocuments({
      projects: [project],
      notes: [note],
      tasks: [task],
      meetings: [meeting],
      companies: [company],
      people: [person],
      assistantState: emptyState({
        activeConversationId: "c1",
        conversations: [chat1, chat2],
      }),
    });

    expect(docs.some((doc) => doc.id === "chat:c1")).toBe(false);
    expect(docs.some((doc) => doc.id === "chat:c2")).toBe(true);
    expect(docs.some((doc) => doc.id === "project:p1")).toBe(true);
    expect(docs.some((doc) => doc.id === "note:n1")).toBe(true);
  });
});
