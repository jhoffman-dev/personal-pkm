import type { ObjectTypeDefinition } from "@/lib/object-types-store-model";

export const SYSTEM_OBJECT_TYPES: ObjectTypeDefinition[] = [
  {
    id: "object_type_people",
    name: "People",
    isSystem: true,
    properties: [
      {
        id: "property_first_name",
        name: "First Name",
        type: "text",
        isRequired: true,
      },
      {
        id: "property_last_name",
        name: "Last Name",
        type: "text",
        isRequired: true,
      },
      {
        id: "property_email",
        name: "Email",
        type: "email",
        isRequired: false,
      },
      {
        id: "property_phone",
        name: "Phone",
        type: "phone",
        isRequired: false,
      },
      {
        id: "property_address",
        name: "Address",
        type: "address",
        isRequired: false,
      },
    ],
  },
  {
    id: "object_type_companies",
    name: "Companies",
    isSystem: true,
    properties: [
      {
        id: "property_company_name",
        name: "Company Name",
        type: "text",
        isRequired: true,
      },
      {
        id: "property_email",
        name: "Email",
        type: "email",
        isRequired: false,
      },
      {
        id: "property_phone",
        name: "Phone",
        type: "phone",
        isRequired: false,
      },
      {
        id: "property_address",
        name: "Address",
        type: "address",
        isRequired: false,
      },
    ],
  },
  {
    id: "object_type_projects",
    name: "Projects",
    isSystem: true,
    properties: [
      {
        id: "property_project_name",
        name: "Project Name",
        type: "text",
        isRequired: true,
      },
    ],
  },
  {
    id: "object_type_notes",
    name: "Notes",
    isSystem: true,
    properties: [
      {
        id: "property_note_title",
        name: "Title",
        type: "text",
        isRequired: true,
      },
    ],
  },
  {
    id: "object_type_tasks",
    name: "Tasks",
    isSystem: true,
    properties: [
      {
        id: "property_task_title",
        name: "Task Title",
        type: "text",
        isRequired: true,
      },
    ],
  },
  {
    id: "object_type_meetings",
    name: "Meetings",
    isSystem: true,
    properties: [
      {
        id: "property_meeting_title",
        name: "Meeting Title",
        type: "text",
        isRequired: true,
      },
    ],
  },
];
