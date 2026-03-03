/**
 * Persisted OAuth token metadata for Google API access.
 *
 * Constraint:
 * - `expiresAt` is a Unix epoch in milliseconds.
 */
export type StoredGoogleToken = {
  accessToken: string;
  expiresAt: number;
};

/**
 * Normalized calendar event model used by application and UI layers.
 */
export type GoogleCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  htmlLink?: string;
};
