import type { Note } from "@/data/entities";
import { getDataModules } from "@/data";

const NOTE_LINK_QUEUE_STORAGE_KEY = "pkm.note-linking.queue.v1";

type NoteLinkQueueJob = {
  noteId: string;
  queuedAt: string;
  updatedAt: string;
  attempts: number;
  lastError?: string;
};

type NoteLinkQueueState = {
  jobsByNoteId: Record<string, NoteLinkQueueJob>;
  lastScheduledRunAt?: string;
};

const DEFAULT_QUEUE_STATE: NoteLinkQueueState = {
  jobsByNoteId: {},
};

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "have",
  "will",
  "your",
  "you",
  "are",
  "was",
  "were",
  "not",
  "but",
  "can",
  "has",
  "had",
  "its",
  "our",
  "their",
  "into",
  "about",
  "also",
  "then",
  "than",
  "when",
  "where",
  "what",
  "which",
  "who",
  "how",
  "why",
  "all",
  "any",
  "just",
  "more",
  "most",
  "only",
  "some",
  "such",
  "very",
  "been",
  "being",
  "them",
  "they",
  "there",
  "here",
  "over",
  "under",
  "again",
  "each",
  "other",
  "too",
  "via",
  "per",
]);

function loadQueueState(): NoteLinkQueueState {
  if (typeof window === "undefined") {
    return DEFAULT_QUEUE_STATE;
  }

  const raw = window.localStorage.getItem(NOTE_LINK_QUEUE_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_QUEUE_STATE;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<NoteLinkQueueState>;
    return {
      jobsByNoteId: parsed.jobsByNoteId ?? {},
      lastScheduledRunAt: parsed.lastScheduledRunAt,
    };
  } catch {
    return DEFAULT_QUEUE_STATE;
  }
}

function saveQueueState(state: NoteLinkQueueState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    NOTE_LINK_QUEUE_STORAGE_KEY,
    JSON.stringify(state),
  );
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ");
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function toTokenSet(values: string[]): Set<string> {
  return new Set(values.flatMap((value) => tokenize(value)));
}

function intersectCount(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  let count = 0;
  left.forEach((token) => {
    if (right.has(token)) {
      count += 1;
    }
  });

  return count;
}

function jaccardScore(left: Set<string>, right: Set<string>): number {
  const overlap = intersectCount(left, right);
  if (overlap === 0) {
    return 0;
  }

  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : overlap / union;
}

function similarityScore(
  base: Note,
  candidate: Note,
): {
  score: number;
  overlap: number;
} {
  const baseAll = toTokenSet([
    base.title,
    stripHtml(base.body),
    ...(base.tags ?? []),
  ]);
  const candidateAll = toTokenSet([
    candidate.title,
    stripHtml(candidate.body),
    ...(candidate.tags ?? []),
  ]);
  const baseTitle = toTokenSet([base.title]);
  const candidateTitle = toTokenSet([candidate.title]);
  const baseTags = toTokenSet(base.tags ?? []);
  const candidateTags = toTokenSet(candidate.tags ?? []);

  const overlap = intersectCount(baseAll, candidateAll);
  if (overlap < 2) {
    return { score: 0, overlap };
  }

  const combined = jaccardScore(baseAll, candidateAll);
  const title = jaccardScore(baseTitle, candidateTitle);
  const tags = jaccardScore(baseTags, candidateTags);

  const score = combined * 0.65 + title * 0.25 + tags * 0.1;
  return { score, overlap };
}

function areArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function suggestRelatedNoteIds(
  note: Note,
  allNotes: Note[],
  maxLinks: number,
): string[] {
  const candidates = allNotes
    .filter((candidate) => candidate.id !== note.id)
    .map((candidate) => {
      const similarity = similarityScore(note, candidate);
      return {
        id: candidate.id,
        score: similarity.score,
        overlap: similarity.overlap,
      };
    })
    .filter((item) => item.overlap >= 2 && item.score >= 0.28)
    .sort((left, right) => right.score - left.score);

  if (candidates.length === 0) {
    return [];
  }

  const [top, second] = candidates;
  if (top.score < 0.32) {
    return [];
  }

  if (second && top.score - second.score < 0.08) {
    return [];
  }

  return [top.id].slice(0, Math.max(1, Math.min(maxLinks, 1)));
}

export function enqueueNoteForLinking(noteId: string): void {
  const now = new Date().toISOString();
  const state = loadQueueState();
  const current = state.jobsByNoteId[noteId];

  state.jobsByNoteId[noteId] = {
    noteId,
    queuedAt: current?.queuedAt ?? now,
    updatedAt: now,
    attempts: current?.attempts ?? 0,
    lastError: current?.lastError,
  };

  saveQueueState(state);
}

export function getQueuedNoteLinkCount(): number {
  return Object.keys(loadQueueState().jobsByNoteId).length;
}

export async function processNoteLinkQueue(options?: {
  maxNotes?: number;
  maxLinksPerNote?: number;
}): Promise<{
  processed: number;
  updated: number;
  failed: number;
  remaining: number;
}> {
  const maxNotes = options?.maxNotes ?? 20;
  const maxLinksPerNote = options?.maxLinksPerNote ?? 5;

  const state = loadQueueState();
  const jobs = Object.values(state.jobsByNoteId)
    .sort(
      (left, right) =>
        new Date(left.updatedAt).getTime() -
        new Date(right.updatedAt).getTime(),
    )
    .slice(0, maxNotes);

  if (jobs.length === 0) {
    return {
      processed: 0,
      updated: 0,
      failed: 0,
      remaining: 0,
    };
  }

  const modules = getDataModules();
  const allNotes = await modules.notes.list();

  let processed = 0;
  let updated = 0;
  let failed = 0;

  for (const job of jobs) {
    processed += 1;

    try {
      const note = allNotes.find((item) => item.id === job.noteId);
      if (!note) {
        delete state.jobsByNoteId[job.noteId];
        continue;
      }

      if ((note.relatedNoteIds ?? []).length > 0) {
        delete state.jobsByNoteId[job.noteId];
        continue;
      }

      const suggested = suggestRelatedNoteIds(note, allNotes, maxLinksPerNote);
      const currentRelated = note.relatedNoteIds ?? [];
      const changed = !areArraysEqual(currentRelated, suggested);

      if (changed) {
        await modules.notes.update(note.id, {
          relatedNoteIds: suggested,
        });
        updated += 1;
      }

      delete state.jobsByNoteId[job.noteId];
    } catch (error) {
      failed += 1;
      state.jobsByNoteId[job.noteId] = {
        ...job,
        attempts: (job.attempts ?? 0) + 1,
        updatedAt: new Date().toISOString(),
        lastError: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  saveQueueState(state);

  return {
    processed,
    updated,
    failed,
    remaining: Object.keys(state.jobsByNoteId).length,
  };
}

function parseTime(value: string): { hour: number; minute: number } {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    Number.isInteger(hour) &&
    Number.isInteger(minute) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59
  ) {
    return { hour, minute };
  }

  return { hour: 0, minute: 0 };
}

export async function runScheduledNoteLinkProcessingIfDue(settings: {
  noteLinkScheduleEnabled: boolean;
  noteLinkScheduleTime: string;
}): Promise<boolean> {
  if (!settings.noteLinkScheduleEnabled) {
    return false;
  }

  const now = new Date();
  const { hour, minute } = parseTime(settings.noteLinkScheduleTime);
  const scheduledAt = new Date(now);
  scheduledAt.setHours(hour, minute, 0, 0);

  if (now.getTime() < scheduledAt.getTime()) {
    return false;
  }

  const state = loadQueueState();
  if (state.lastScheduledRunAt) {
    const lastRun = new Date(state.lastScheduledRunAt);
    if (
      lastRun.getFullYear() === now.getFullYear() &&
      lastRun.getMonth() === now.getMonth() &&
      lastRun.getDate() === now.getDate()
    ) {
      return false;
    }
  }

  await processNoteLinkQueue();

  state.lastScheduledRunAt = new Date().toISOString();
  saveQueueState(state);
  return true;
}
