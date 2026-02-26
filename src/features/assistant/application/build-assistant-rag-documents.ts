import type {
  Company,
  Meeting,
  Note,
  Person,
  Project,
  Task,
} from "@/data/entities";
import type {
  AssistantConversation,
  StoredAssistantState,
} from "@/lib/assistant-storage";
import { DEFAULT_CONVERSATION_TITLE } from "@/lib/assistant-storage";
import type { RagDocument } from "@/lib/rag-context";
import {
  personDisplayName,
  toPlainText,
  truncateText,
} from "@/features/assistant/domain/text-utils";

function conversationExcerpt(conversation: AssistantConversation): string {
  return conversation.messages
    .slice(-8)
    .map((message) => `${message.role}: ${toPlainText(message.content)}`)
    .join("\n")
    .trim();
}

export function buildAssistantRagDocuments(params: {
  projects: Project[];
  notes: Note[];
  tasks: Task[];
  meetings: Meeting[];
  companies: Company[];
  people: Person[];
  assistantState: StoredAssistantState;
}): RagDocument[] {
  const {
    projects,
    notes,
    tasks,
    meetings,
    companies,
    people,
    assistantState,
  } = params;

  const documents = [
    ...projects.map((project) => ({
      id: `project:${project.id}`,
      sourceType: "Project",
      title: project.name || "Untitled project",
      updatedAt: project.updatedAt,
      content: truncateText(
        [project.description, (project.tags ?? []).join(" "), project.paraType]
          .filter(Boolean)
          .join("\n"),
      ),
    })),
    ...notes.map((note) => ({
      id: `note:${note.id}`,
      sourceType: "Note",
      title: note.title || "Untitled note",
      updatedAt: note.updatedAt,
      content: truncateText(
        [toPlainText(note.body), (note.tags ?? []).join(" ")]
          .filter(Boolean)
          .join("\n"),
        900,
      ),
    })),
    ...tasks.map((task) => ({
      id: `task:${task.id}`,
      sourceType: "Task",
      title: task.title || "Untitled task",
      updatedAt: task.updatedAt,
      content: truncateText(
        [
          task.description,
          task.notes,
          `status:${task.status}`,
          `level:${task.level}`,
          (task.tags ?? []).join(" "),
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    })),
    ...meetings.map((meeting) => ({
      id: `meeting:${meeting.id}`,
      sourceType: "Meeting",
      title: meeting.title || "Untitled meeting",
      updatedAt: meeting.updatedAt,
      content: truncateText(
        [
          meeting.location,
          `scheduled:${meeting.scheduledFor}`,
          (meeting.tags ?? []).join(" "),
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    })),
    ...companies.map((company) => ({
      id: `company:${company.id}`,
      sourceType: "Company",
      title: company.name || "Untitled company",
      updatedAt: company.updatedAt,
      content: truncateText(
        [
          company.email,
          company.phone,
          company.website,
          company.address,
          (company.tags ?? []).join(" "),
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    })),
    ...people.map((person) => ({
      id: `person:${person.id}`,
      sourceType: "Person",
      title: personDisplayName(person) || "Unnamed person",
      updatedAt: person.updatedAt,
      content: truncateText(
        [
          person.email,
          person.phone,
          person.address,
          (person.tags ?? []).join(" "),
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    })),
    ...assistantState.conversations
      .filter(
        (conversation) =>
          conversation.id !== assistantState.activeConversationId,
      )
      .map((conversation) => ({
        id: `chat:${conversation.id}`,
        sourceType: "Assistant Chat",
        title: conversation.title || DEFAULT_CONVERSATION_TITLE,
        updatedAt: conversation.updatedAt,
        content: truncateText(conversationExcerpt(conversation), 1200),
      })),
  ];

  return documents.filter((document) => {
    const title = document.title.trim();
    const content = document.content.trim();
    return title.length > 0 || content.length > 0;
  });
}
