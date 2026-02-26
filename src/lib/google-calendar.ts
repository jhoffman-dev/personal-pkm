const GOOGLE_IDENTITY_SCRIPT_ID = "google-identity-services";
const GOOGLE_IDENTITY_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type GoogleTokenClientConfig = {
  client_id: string;
  scope: string;
  callback: (response: GoogleTokenResponse) => void;
  error_callback?: (error: { type?: string }) => void;
};

type GoogleWindow = Window & {
  google?: {
    accounts?: {
      oauth2?: {
        initTokenClient: (config: GoogleTokenClientConfig) => {
          requestAccessToken: (options?: { prompt?: string }) => void;
        };
      };
    };
  };
};

function getGoogleWindow(): GoogleWindow {
  return window as GoogleWindow;
}

function toGoogleAuthErrorMessage(rawMessage: string): string {
  const normalized = rawMessage.toLowerCase();

  if (
    normalized.includes("native_desktop") ||
    normalized.includes("storagerelay")
  ) {
    return "Google Calendar connect requires a Web application OAuth client ID. Replace the Desktop client ID in Settings → Connections with a Web client ID from Google Cloud Console.";
  }

  if (normalized.includes("origin") && normalized.includes("not allowed")) {
    return "Google OAuth origin is not allowed. Add your app origin to Authorized JavaScript origins in the OAuth Web client (for dev: http://localhost:5173).";
  }

  return rawMessage;
}

export async function loadGoogleIdentityServicesScript(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error(
      "Google Identity Services is only available in the browser",
    );
  }

  const existing = document.getElementById(
    GOOGLE_IDENTITY_SCRIPT_ID,
  ) as HTMLScriptElement | null;

  if (existing) {
    if (getGoogleWindow().google?.accounts?.oauth2) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google Identity Services")),
        { once: true },
      );
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = GOOGLE_IDENTITY_SCRIPT_ID;
    script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });
}

export async function requestGoogleCalendarAccessToken(options: {
  clientId: string;
  prompt?: string;
  scope?: string;
}): Promise<{ accessToken: string; expiresAt: number }> {
  await loadGoogleIdentityServicesScript();

  const oauth2 = getGoogleWindow().google?.accounts?.oauth2;
  if (!oauth2) {
    throw new Error("Google Identity Services failed to initialize");
  }

  const scope =
    options.scope ?? "https://www.googleapis.com/auth/calendar.readonly";

  return await new Promise<{ accessToken: string; expiresAt: number }>(
    (resolve, reject) => {
      const tokenClient = oauth2.initTokenClient({
        client_id: options.clientId,
        scope,
        callback: (response) => {
          if (!response.access_token) {
            const rawMessage =
              response.error_description ||
              response.error ||
              "Google authorization failed";
            reject(new Error(toGoogleAuthErrorMessage(rawMessage)));
            return;
          }

          const expiresInSeconds = response.expires_in ?? 3600;
          resolve({
            accessToken: response.access_token,
            expiresAt: Date.now() + expiresInSeconds * 1000,
          });
        },
        error_callback: (error) => {
          const rawMessage = error.type
            ? `Google authorization error: ${error.type}`
            : "Google authorization error";

          reject(new Error(toGoogleAuthErrorMessage(rawMessage)));
        },
      });

      tokenClient.requestAccessToken({ prompt: options.prompt ?? "consent" });
    },
  );
}

type GoogleCalendarListResponse = {
  items?: Array<{
    id?: string;
    summary?: string;
    htmlLink?: string;
    start?: { date?: string; dateTime?: string };
    end?: { date?: string; dateTime?: string };
  }>;
  error?: {
    message?: string;
  };
};

export async function listGoogleCalendarEvents(options: {
  accessToken: string;
  calendarId: string;
  timeMin: string;
  timeMax: string;
  maxResults?: number;
}): Promise<
  Array<{
    id: string;
    title: string;
    start: string;
    end?: string;
    allDay: boolean;
    htmlLink?: string;
  }>
> {
  const calendarId = encodeURIComponent(options.calendarId || "primary");
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin: options.timeMin,
    timeMax: options.timeMax,
    maxResults: String(options.maxResults ?? 500),
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
      },
    },
  );

  const payload = (await response.json()) as GoogleCalendarListResponse;

  if (!response.ok) {
    throw new Error(
      payload.error?.message || "Failed to fetch Google Calendar events",
    );
  }

  return (payload.items ?? [])
    .map((item) => {
      const start = item.start?.dateTime ?? item.start?.date;
      if (!item.id || !start) {
        return null;
      }

      return {
        id: item.id,
        title: item.summary?.trim() || "Untitled event",
        start,
        end: item.end?.dateTime ?? item.end?.date,
        allDay: Boolean(item.start?.date && !item.start?.dateTime),
        htmlLink: item.htmlLink,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}
