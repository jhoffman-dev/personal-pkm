export type StoredGoogleToken = {
  accessToken: string;
  expiresAt: number;
};

export type GoogleCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  htmlLink?: string;
};
