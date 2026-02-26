import {
  isLikelyValidGoogleCalendarId,
  mapGoogleCalendarSyncErrorMessage,
} from "@/features/google-calendar/domain/google-calendar-policy";
import { describe, expect, it } from "vitest";

describe("google-calendar-policy", () => {
  it("accepts primary and email-like calendar ids", () => {
    expect(isLikelyValidGoogleCalendarId("primary")).toBe(true);
    expect(
      isLikelyValidGoogleCalendarId("team@group.calendar.google.com"),
    ).toBe(true);
  });

  it("rejects empty and display-name-like calendar ids", () => {
    expect(isLikelyValidGoogleCalendarId("")).toBe(false);
    expect(isLikelyValidGoogleCalendarId("My Team Calendar")).toBe(false);
  });

  it("maps bad request errors to actionable guidance", () => {
    expect(mapGoogleCalendarSyncErrorMessage("Bad Request")).toContain(
      "Verify Calendar ID",
    );
    expect(mapGoogleCalendarSyncErrorMessage("network timeout")).toBe(
      "network timeout",
    );
  });
});
