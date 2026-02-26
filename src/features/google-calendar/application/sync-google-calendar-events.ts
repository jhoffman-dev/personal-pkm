import {
  isLikelyValidGoogleCalendarId,
  mapGoogleCalendarSyncErrorMessage,
} from "@/features/google-calendar/domain/google-calendar-policy";
import type { GoogleCalendarEvent } from "@/features/google-calendar/domain/google-calendar";
import { listGoogleCalendarEvents } from "@/lib/google-calendar";

export type SyncGoogleCalendarEventsResult = {
  events: GoogleCalendarEvent[];
  statusMessage: string;
};

/**
 * Imports a bounded time window of Google Calendar events for the requested
 * calendar id and returns normalized event records.
 */
export async function syncGoogleCalendarEvents(options: {
  accessToken: string;
  calendarId: string;
  now?: Date;
}): Promise<SyncGoogleCalendarEventsResult> {
  const calendarId = options.calendarId.trim() || "primary";
  if (!isLikelyValidGoogleCalendarId(calendarId)) {
    throw new Error(
      "Invalid Calendar ID. Use `primary` or the calendar's actual ID (usually an email-like value such as name@group.calendar.google.com).",
    );
  }

  const now = options.now ?? new Date();
  const timeMin = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    now.getDate(),
  ).toISOString();
  const timeMax = new Date(
    now.getFullYear(),
    now.getMonth() + 6,
    now.getDate(),
  ).toISOString();

  try {
    const events = await listGoogleCalendarEvents({
      accessToken: options.accessToken,
      calendarId,
      timeMin,
      timeMax,
      maxResults: 500,
    });

    return {
      events,
      statusMessage: `Imported ${events.length} Google event${events.length === 1 ? "" : "s"}`,
    };
  } catch (error) {
    const rawMessage =
      error instanceof Error
        ? error.message
        : "Failed to import Google Calendar events";

    throw new Error(mapGoogleCalendarSyncErrorMessage(rawMessage));
  }
}
