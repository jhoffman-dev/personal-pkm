import { createEntityId, nowIsoDate, type IsoDateString } from "@/data/types";

const BROWSER_BOOKMARKS_STORAGE_KEY = "pkm.browser-bookmarks.v1";

export type BrowserBookmark = {
  id: string;
  title: string;
  url: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

function parseBookmark(value: unknown): BrowserBookmark | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.title !== "string" ||
    typeof record.url !== "string"
  ) {
    return null;
  }

  const createdAt =
    typeof record.createdAt === "string" ? record.createdAt : nowIsoDate();
  const updatedAt =
    typeof record.updatedAt === "string" ? record.updatedAt : createdAt;

  return {
    id: record.id,
    title: record.title,
    url: record.url,
    createdAt,
    updatedAt,
  };
}

function loadBookmarks(): BrowserBookmark[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(BROWSER_BOOKMARKS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => parseBookmark(entry))
      .filter((entry): entry is BrowserBookmark => Boolean(entry));
  } catch {
    return [];
  }
}

function persistBookmarks(bookmarks: BrowserBookmark[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    BROWSER_BOOKMARKS_STORAGE_KEY,
    JSON.stringify(bookmarks),
  );
}

export function normalizeBrowserUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (!/^https?:$/.test(parsed.protocol)) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

export function listBrowserBookmarks(): BrowserBookmark[] {
  return loadBookmarks().sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export function createBrowserBookmark(input: {
  title: string;
  url: string;
}): BrowserBookmark {
  const now = nowIsoDate();
  const next: BrowserBookmark = {
    id: createEntityId("bookmark"),
    title: input.title,
    url: input.url,
    createdAt: now,
    updatedAt: now,
  };

  persistBookmarks([next, ...listBrowserBookmarks()]);
  return next;
}

export function upsertBrowserBookmark(input: {
  title: string;
  url: string;
}): BrowserBookmark {
  const bookmarks = listBrowserBookmarks();
  const existing = bookmarks.find((bookmark) => bookmark.url === input.url);

  if (!existing) {
    return createBrowserBookmark(input);
  }

  const updated: BrowserBookmark = {
    ...existing,
    title: input.title,
    updatedAt: nowIsoDate(),
  };

  persistBookmarks(
    bookmarks.map((bookmark) =>
      bookmark.id === existing.id ? updated : bookmark,
    ),
  );

  return updated;
}

export function deleteBrowserBookmark(id: string): boolean {
  const bookmarks = listBrowserBookmarks();
  const next = bookmarks.filter((bookmark) => bookmark.id !== id);
  if (next.length === bookmarks.length) {
    return false;
  }

  persistBookmarks(next);
  return true;
}
