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

export function mapGoogleCalendarSyncErrorMessage(rawMessage: string): string {
  return rawMessage.toLowerCase().includes("bad request")
    ? "Google Calendar request failed (400). Verify Calendar ID in Settings (use `primary` or the calendar's ID, not the calendar display name)."
    : rawMessage;
}
