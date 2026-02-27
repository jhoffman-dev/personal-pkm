import { createEntityId, nowIsoDate, type IsoDateString } from "@/data/types";

const DRAWINGS_STORAGE_KEY = "pkm.drawings.v1";

export type DrawingScene = {
  elements: unknown[];
};

export type DrawingRecord = {
  id: string;
  title: string;
  scene: DrawingScene;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

function normalizeDrawing(value: unknown): DrawingRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : null;
  if (!id) {
    return null;
  }

  const title =
    typeof record.title === "string" ? record.title : "Untitled drawing";
  const createdAt =
    typeof record.createdAt === "string" ? record.createdAt : nowIsoDate();
  const updatedAt =
    typeof record.updatedAt === "string" ? record.updatedAt : createdAt;

  const sceneValue = record.scene as Record<string, unknown> | undefined;
  const elements = Array.isArray(sceneValue?.elements)
    ? sceneValue.elements
    : [];

  return {
    id,
    title,
    scene: {
      elements,
    },
    createdAt,
    updatedAt,
  };
}

function loadState(): DrawingRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(DRAWINGS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => normalizeDrawing(entry))
      .filter((entry): entry is DrawingRecord => Boolean(entry));
  } catch {
    return [];
  }
}

function persistState(drawings: DrawingRecord[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DRAWINGS_STORAGE_KEY, JSON.stringify(drawings));
}

export function listDrawings(): DrawingRecord[] {
  return loadState().sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export function getDrawingById(id: string): DrawingRecord | null {
  return listDrawings().find((drawing) => drawing.id === id) ?? null;
}

export function createDrawing(title = "Untitled drawing"): DrawingRecord {
  const timestamp = nowIsoDate();
  const next: DrawingRecord = {
    id: createEntityId("drawing"),
    title,
    scene: {
      elements: [],
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const drawings = listDrawings();
  persistState([next, ...drawings]);
  return next;
}

export function updateDrawing(
  id: string,
  input: Partial<Pick<DrawingRecord, "title" | "scene">>,
): DrawingRecord | null {
  const drawings = listDrawings();
  const index = drawings.findIndex((drawing) => drawing.id === id);
  if (index < 0) {
    return null;
  }

  const existing = drawings[index];
  const next: DrawingRecord = {
    ...existing,
    ...input,
    scene: {
      elements: Array.isArray(input.scene?.elements)
        ? input.scene.elements
        : existing.scene.elements,
    },
    updatedAt: nowIsoDate(),
  };

  const nextDrawings = [...drawings];
  nextDrawings[index] = next;
  persistState(nextDrawings);
  return next;
}

export function deleteDrawing(id: string): boolean {
  const drawings = listDrawings();
  const next = drawings.filter((drawing) => drawing.id !== id);
  if (next.length === drawings.length) {
    return false;
  }

  persistState(next);
  return true;
}
