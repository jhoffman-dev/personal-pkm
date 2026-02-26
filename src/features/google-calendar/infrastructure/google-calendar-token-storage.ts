import type { StoredGoogleToken } from "@/features/google-calendar/domain/google-calendar";

export const GOOGLE_CALENDAR_TOKEN_STORAGE_KEY = "pkm.google-calendar.token.v1";

/**
 * Browser-only token persistence for Google OAuth access tokens.
 */
export function loadStoredGoogleToken(): StoredGoogleToken | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(GOOGLE_CALENDAR_TOKEN_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredGoogleToken;
    if (
      !parsed.accessToken ||
      !parsed.expiresAt ||
      parsed.expiresAt <= Date.now()
    ) {
      window.localStorage.removeItem(GOOGLE_CALENDAR_TOKEN_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(GOOGLE_CALENDAR_TOKEN_STORAGE_KEY);
    return null;
  }
}

export function saveStoredGoogleToken(token: StoredGoogleToken | null): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!token) {
    window.localStorage.removeItem(GOOGLE_CALENDAR_TOKEN_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    GOOGLE_CALENDAR_TOKEN_STORAGE_KEY,
    JSON.stringify(token),
  );
}
