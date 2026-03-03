/**
 * Heuristic validation for Google Calendar identifiers.
 *
 * Rules:
 * - `primary` is always accepted.
 * - Non-empty values containing `@` are treated as plausible calendar ids.
 */
export function isLikelyValidGoogleCalendarId(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) {
    return false;
  }

  if (normalized === "primary") {
    return true;
  }

  return normalized.includes("@");
}

/**
 * Maps low-level sync errors to user-focused troubleshooting guidance.
 */
export function mapGoogleCalendarSyncErrorMessage(rawMessage: string): string {
  return rawMessage.toLowerCase().includes("bad request")
    ? "Google Calendar request failed (400). Verify Calendar ID in Settings (use `primary` or the calendar's ID, not the calendar display name)."
    : rawMessage;
}
