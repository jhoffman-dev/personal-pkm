import type { Note, UpdateNoteInput } from "@/data/entities";
import type { TaskTimeblockMap } from "@/features/task-timeblocking";

export type TaskTimeblockSyncPlan = {
  nextMap: TaskTimeblockMap;
  dueDate: string | null;
};

export function planTaskTimeblockSync(params: {
  taskId: string;
  startIso: string | null;
  endIso: string | null;
  currentMap: TaskTimeblockMap;
}): TaskTimeblockSyncPlan | null {
  const { taskId, startIso, endIso, currentMap } = params;

  if (!startIso || !endIso) {
    if (!currentMap[taskId]) {
      return null;
    }

    const next = { ...currentMap };
    delete next[taskId];
    return {
      nextMap: next,
      dueDate: null,
    };
  }

  if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
    return null;
  }

  return {
    nextMap: {
      ...currentMap,
      [taskId]: {
        start: startIso,
        end: endIso,
      },
    },
    dueDate: startIso,
  };
}

export function buildMainTaskNoteUpdateInput(params: {
  note: Note | null;
  title: string;
  body: string;
}): UpdateNoteInput | null {
  if (!params.note) {
    return null;
  }

  const titleChanged = params.note.title !== params.title;
  const bodyChanged = params.note.body !== params.body;

  if (!titleChanged && !bodyChanged) {
    return null;
  }

  return {
    title: params.title,
    body: params.body,
  };
}
