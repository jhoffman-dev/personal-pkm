import type { CreateProjectInput, ParaType } from "@/data/entities";

export const PARA_TYPES: ParaType[] = [
  "project",
  "area",
  "resource",
  "archive",
];

export const PARA_TYPE_LABELS: Record<ParaType, string> = {
  project: "Project",
  area: "Area",
  resource: "Resource",
  archive: "Archive",
};

export function normalizeParaType(value?: string | null): ParaType {
  if (!value) {
    return "project";
  }

  const normalized = value.toLowerCase() as ParaType;
  return PARA_TYPES.includes(normalized) ? normalized : "project";
}

export function createEmptyProjectInput(params?: {
  name?: string;
  paraType?: ParaType;
}): CreateProjectInput {
  return {
    name: params?.name?.trim() || "Untitled project",
    paraType: params?.paraType ?? "project",
    description: "",
    personIds: [],
    companyIds: [],
    noteIds: [],
    taskIds: [],
    meetingIds: [],
  };
}
