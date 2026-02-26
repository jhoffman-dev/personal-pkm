import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  APP_SETTINGS_UPDATED_EVENT,
  loadAppSettings,
  type AppSettings,
} from "@/lib/app-settings";
import {
  listGoogleCalendarEvents,
  requestGoogleCalendarAccessToken,
} from "@/lib/google-calendar";
import { dataThunks, useAppDispatch, useAppSelector } from "@/store";
import type { EventClickArg, EventInput } from "@fullcalendar/core/index.js";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useCallback, useEffect, useMemo, useState } from "react";

const GOOGLE_CALENDAR_TOKEN_STORAGE_KEY = "pkm.google-calendar.token.v1";

type StoredGoogleToken = {
  accessToken: string;
  expiresAt: number;
};

type SelectedCalendarEvent = {
  id: string;
  title: string;
  startText: string;
  endText: string;
  source: "meeting" | "task" | "google" | "unknown";
  googleHtmlLink?: string;
};

function loadStoredGoogleToken(): StoredGoogleToken | null {
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

function saveStoredGoogleToken(token: StoredGoogleToken | null): void {
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

function isValidIsoDate(value?: string): boolean {
  if (!value) {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
}

function addMinutes(isoDateString: string, minutes: number): string {
  const date = new Date(isoDateString);
  if (Number.isNaN(date.getTime())) {
    return isoDateString;
  }

  return new Date(date.getTime() + minutes * 60_000).toISOString();
}

function formatEventDateTime(value: Date | null): string {
  if (!value || Number.isNaN(value.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function isLikelyValidGoogleCalendarId(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) {
    return false;
  }

  if (normalized === "primary") {
    return true;
  }

  return normalized.includes("@");
}

export function CalendarPage() {
  const dispatch = useAppDispatch();
  const meetingsState = useAppSelector((state) => state.meetings);
  const tasksState = useAppSelector((state) => state.tasks);
  const [settings, setSettings] = useState<AppSettings>(() =>
    loadAppSettings(),
  );
  const [googleToken, setGoogleToken] = useState<StoredGoogleToken | null>(() =>
    loadStoredGoogleToken(),
  );
  const [googleEvents, setGoogleEvents] = useState<EventInput[]>([]);
  const [googleStatus, setGoogleStatus] = useState<string | null>(null);
  const [isAuthorizingGoogle, setIsAuthorizingGoogle] = useState(false);
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);
  const [selectedEvent, setSelectedEvent] =
    useState<SelectedCalendarEvent | null>(null);

  const googleConfigured =
    settings.googleCalendarEnabled &&
    settings.googleCalendarClientId.trim().length > 0;

  const syncGoogleEvents = useCallback(
    async (accessToken: string) => {
      const calendarId = settings.googleCalendarCalendarId.trim() || "primary";
      if (!isLikelyValidGoogleCalendarId(calendarId)) {
        setGoogleStatus(
          "Invalid Calendar ID. Use `primary` or the calendar's actual ID (usually an email-like value such as name@group.calendar.google.com).",
        );
        return;
      }

      setIsSyncingGoogle(true);
      setGoogleStatus(null);

      try {
        const now = new Date();
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

        const imported = await listGoogleCalendarEvents({
          accessToken,
          calendarId,
          timeMin,
          timeMax,
          maxResults: 500,
        });

        const mapped: EventInput[] = imported.map((event) => ({
          id: `google-${event.id}`,
          title: event.title,
          start: event.start,
          end:
            event.end ??
            (event.allDay ? undefined : addMinutes(event.start, 30)),
          allDay: event.allDay,
          extendedProps: {
            source: "google",
            googleHtmlLink: event.htmlLink,
          },
        }));

        setGoogleEvents(mapped);
        setGoogleStatus(
          `Imported ${mapped.length} Google event${mapped.length === 1 ? "" : "s"}`,
        );
      } catch (error) {
        const rawMessage =
          error instanceof Error
            ? error.message
            : "Failed to import Google Calendar events";

        const message = rawMessage.toLowerCase().includes("bad request")
          ? "Google Calendar request failed (400). Verify Calendar ID in Settings (use `primary` or the calendar's ID, not the calendar display name)."
          : rawMessage;

        setGoogleStatus(message);
      } finally {
        setIsSyncingGoogle(false);
      }
    },
    [settings.googleCalendarCalendarId],
  );

  const connectGoogleCalendar = useCallback(async () => {
    if (!googleConfigured) {
      setGoogleStatus(
        "Enable Google Calendar and set OAuth Client ID in Settings → Connections.",
      );
      return;
    }

    setIsAuthorizingGoogle(true);
    setGoogleStatus(null);

    try {
      const token = await requestGoogleCalendarAccessToken({
        clientId: settings.googleCalendarClientId,
      });

      setGoogleToken(token);
      saveStoredGoogleToken(token);
      await syncGoogleEvents(token.accessToken);
    } catch (error) {
      setGoogleStatus(
        error instanceof Error ? error.message : "Google authorization failed",
      );
    } finally {
      setIsAuthorizingGoogle(false);
    }
  }, [googleConfigured, settings.googleCalendarClientId, syncGoogleEvents]);

  const disconnectGoogleCalendar = useCallback(() => {
    setGoogleToken(null);
    saveStoredGoogleToken(null);
    setGoogleEvents([]);
    setGoogleStatus("Disconnected Google Calendar");
  }, []);

  useEffect(() => {
    if (meetingsState.status === "idle") {
      void dispatch(dataThunks.meetings.fetchAll());
    }

    if (tasksState.status === "idle") {
      void dispatch(dataThunks.tasks.fetchAll());
    }
  }, [dispatch, meetingsState.status, tasksState.status]);

  useEffect(() => {
    const reloadSettings = () => {
      setSettings(loadAppSettings());
    };

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "pkm-settings") {
        reloadSettings();
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(APP_SETTINGS_UPDATED_EVENT, reloadSettings);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(APP_SETTINGS_UPDATED_EVENT, reloadSettings);
    };
  }, []);

  useEffect(() => {
    if (!googleConfigured) {
      setGoogleEvents([]);
      setGoogleStatus(null);
    }
  }, [googleConfigured]);

  useEffect(() => {
    if (!googleConfigured) {
      return;
    }

    if (!googleToken || googleToken.expiresAt <= Date.now()) {
      return;
    }

    void syncGoogleEvents(googleToken.accessToken);
  }, [googleConfigured, googleToken, syncGoogleEvents]);

  const events = useMemo(() => {
    const meetingEvents: EventInput[] = meetingsState.ids
      .map((id) => meetingsState.entities[id])
      .filter(Boolean)
      .filter((meeting) => isValidIsoDate(meeting.scheduledFor))
      .map((meeting) => ({
        id: `meeting-${meeting.id}`,
        title: meeting.title,
        start: meeting.scheduledFor,
        end: addMinutes(meeting.scheduledFor, 60),
        allDay: false,
        extendedProps: {
          source: "meeting",
        },
      }));

    const taskEvents: EventInput[] = tasksState.ids
      .map((id) => tasksState.entities[id])
      .filter(Boolean)
      .filter(
        (task) =>
          isValidIsoDate(task.dueDate) &&
          task.status !== "complete" &&
          task.status !== "archive",
      )
      .map((task) => ({
        id: `task-${task.id}`,
        title: `Task: ${task.title}`,
        start: task.dueDate,
        allDay: true,
        extendedProps: {
          source: "task",
        },
      }));

    return [...meetingEvents, ...taskEvents, ...googleEvents];
  }, [
    googleEvents,
    meetingsState.entities,
    meetingsState.ids,
    tasksState.entities,
    tasksState.ids,
  ]);

  return (
    <section className="flex h-full min-h-0 flex-col p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Calendar</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Month, week, and day views for meetings, task due dates, and Google
            Calendar import.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!googleConfigured || isAuthorizingGoogle}
            onClick={() => {
              void connectGoogleCalendar();
            }}
          >
            {isAuthorizingGoogle ? "Connecting..." : "Connect Google"}
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!googleToken || isSyncingGoogle}
            onClick={() => {
              if (!googleToken) {
                return;
              }

              void syncGoogleEvents(googleToken.accessToken);
            }}
          >
            {isSyncingGoogle ? "Syncing..." : "Sync now"}
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!googleToken}
            onClick={disconnectGoogleCalendar}
          >
            Disconnect
          </Button>
        </div>
      </div>

      {googleStatus ? (
        <p className="text-muted-foreground mt-3 text-xs">{googleStatus}</p>
      ) : null}

      {!googleConfigured ? (
        <p className="text-muted-foreground mt-3 text-xs">
          Configure Google Calendar in Settings → Connections to enable import.
        </p>
      ) : null}

      <Card className="mt-5 min-h-0 flex-1">
        <CardContent className="h-full min-h-[620px] p-3">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            height="100%"
            editable
            selectable
            nowIndicator
            forceEventDuration
            defaultTimedEventDuration="00:30:00"
            eventMinHeight={24}
            eventContent={(arg) => (
              <div className="h-full overflow-hidden px-1 py-0.5 text-[11px] leading-tight">
                {arg.timeText ? (
                  <div className="truncate font-medium">{arg.timeText}</div>
                ) : null}
                <div className="truncate">{arg.event.title}</div>
              </div>
            )}
            eventClick={(arg: EventClickArg) => {
              const source =
                (arg.event.extendedProps.source as
                  | "meeting"
                  | "task"
                  | "google"
                  | undefined) ?? "unknown";

              setSelectedEvent({
                id: arg.event.id,
                title: arg.event.title || "Untitled event",
                startText: formatEventDateTime(arg.event.start),
                endText: formatEventDateTime(arg.event.end),
                source,
                googleHtmlLink:
                  source === "google"
                    ? (arg.event.extendedProps.googleHtmlLink as
                        | string
                        | undefined)
                    : undefined,
              });
            }}
            events={events}
          />
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedEvent)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEvent(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title ?? "Event"}</DialogTitle>
            <DialogDescription>Event details</DialogDescription>
          </DialogHeader>

          {selectedEvent ? (
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">
                {selectedEvent.startText}
                {selectedEvent.endText !== "-"
                  ? ` → ${selectedEvent.endText}`
                  : ""}
              </p>
              <p className="text-muted-foreground text-xs capitalize">
                Source: {selectedEvent.source}
              </p>
              {selectedEvent.googleHtmlLink ? (
                <a
                  href={selectedEvent.googleHtmlLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm underline"
                >
                  Open in Google Calendar
                </a>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
