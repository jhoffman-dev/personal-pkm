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
import {
  fromDateTimeLocalValue,
  isTaskTimeblockStale,
  loadTaskTimeblocks,
  saveTaskTimeblocks,
  toDateTimeLocalValue,
  type TaskTimeblock,
  type TaskTimeblockMap,
} from "@/lib/task-timeblocks";
import { dataThunks, useAppDispatch, useAppSelector } from "@/store";
import type {
  DatesSetArg,
  EventChangeArg,
  EventClickArg,
  EventInput,
} from "@fullcalendar/core/index.js";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, {
  Draggable,
  type EventReceiveArg,
} from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const GOOGLE_CALENDAR_TOKEN_STORAGE_KEY = "pkm.google-calendar.token.v1";
const CALENDAR_LAST_VIEW_STORAGE_KEY = "pkm.calendar.last-view.v1";

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
  taskId?: string;
  startIso?: string;
  endIso?: string;
};

type BacklogTaskGroup = {
  projectName: string;
  tasks: Array<{
    id: string;
    title: string;
  }>;
};

function loadLastCalendarView(): string {
  if (typeof window === "undefined") {
    return "dayGridMonth";
  }

  const raw = window.localStorage.getItem(CALENDAR_LAST_VIEW_STORAGE_KEY);
  if (!raw) {
    return "dayGridMonth";
  }

  if (
    raw === "dayGridMonth" ||
    raw === "timeGridWeek" ||
    raw === "timeGridDay"
  ) {
    return raw;
  }

  return "dayGridMonth";
}

function saveLastCalendarView(view: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CALENDAR_LAST_VIEW_STORAGE_KEY, view);
}

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

function addMinutesToDate(baseDate: Date, minutes: number): Date {
  return new Date(baseDate.getTime() + minutes * 60_000);
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
  const projectsState = useAppSelector((state) => state.projects);
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
  const [taskTimeblocks, setTaskTimeblocks] = useState<TaskTimeblockMap>(() =>
    loadTaskTimeblocks(),
  );
  const backlogContainerRef = useRef<HTMLDivElement | null>(null);
  const [calendarInitialView] = useState<string>(() => loadLastCalendarView());
  const [taskDialogStartValue, setTaskDialogStartValue] = useState("");
  const [taskDialogEndValue, setTaskDialogEndValue] = useState("");
  const [isSavingTaskDialogTime, setIsSavingTaskDialogTime] = useState(false);

  const defaultTaskTimeblockMinutes =
    settings.taskTimeblockDefaultMinutes > 0
      ? settings.taskTimeblockDefaultMinutes
      : 30;

  const googleConfigured =
    settings.googleCalendarEnabled &&
    settings.googleCalendarClientId.trim().length > 0;

  const upsertTaskTimeblock = useCallback(
    (taskId: string, block: TaskTimeblock) => {
      setTaskTimeblocks((current) => {
        const next = {
          ...current,
          [taskId]: block,
        };
        saveTaskTimeblocks(next);
        return next;
      });
    },
    [],
  );

  const removeTaskTimeblock = useCallback((taskId: string) => {
    setTaskTimeblocks((current) => {
      if (!current[taskId]) {
        return current;
      }

      const { [taskId]: _removed, ...next } = current;
      saveTaskTimeblocks(next);
      return next;
    });
  }, []);

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
    if (projectsState.status === "idle") {
      void dispatch(dataThunks.projects.fetchAll());
    }
  }, [dispatch, meetingsState.status, projectsState.status, tasksState.status]);

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

  useEffect(() => {
    if (tasksState.status !== "succeeded") {
      return;
    }

    setTaskTimeblocks((current) => {
      let changed = false;
      const next = { ...current };

      Object.entries(current).forEach(([taskId, block]) => {
        const task = tasksState.entities[taskId];
        if (!task) {
          return;
        }

        const incomplete =
          task.status !== "complete" && task.status !== "archive";
        if (incomplete && isTaskTimeblockStale(block)) {
          delete next[taskId];
          changed = true;
        }
      });

      if (!changed) {
        return current;
      }

      saveTaskTimeblocks(next);
      return next;
    });
  }, [tasksState.entities, tasksState.status]);

  const backlogTaskGroups = useMemo<BacklogTaskGroup[]>(() => {
    const projectNameById = new Map<string, string>(
      projectsState.ids
        .map((id) => projectsState.entities[id])
        .filter(Boolean)
        .map((project) => [project.id, project.name]),
    );

    const grouped = new Map<string, BacklogTaskGroup>();
    const unassignedKey = "No Project";

    tasksState.ids
      .map((id) => tasksState.entities[id])
      .filter(Boolean)
      .filter(
        (task) =>
          (task.status === "next_action" || task.status === "in_progress") &&
          !taskTimeblocks[task.id],
      )
      .forEach((task) => {
        const firstProjectName = (task.projectIds ?? [])
          .map((projectId) => projectNameById.get(projectId))
          .find(Boolean);

        const groupKey = firstProjectName ?? unassignedKey;
        const current = grouped.get(groupKey) ?? {
          projectName: groupKey,
          tasks: [],
        };

        current.tasks.push({
          id: task.id,
          title: task.title,
        });
        grouped.set(groupKey, current);
      });

    return Array.from(grouped.values())
      .map((group) => ({
        ...group,
        tasks: group.tasks.sort((left, right) =>
          left.title.localeCompare(right.title),
        ),
      }))
      .sort((left, right) => left.projectName.localeCompare(right.projectName));
  }, [
    projectsState.entities,
    projectsState.ids,
    taskTimeblocks,
    tasksState.entities,
    tasksState.ids,
  ]);

  useEffect(() => {
    const container = backlogContainerRef.current;
    if (!container) {
      return;
    }

    const draggable = new Draggable(container, {
      itemSelector: ".task-backlog-item",
      eventData: (element) => {
        const taskId = element.getAttribute("data-task-id");
        const title = element.getAttribute("data-task-title");

        if (!taskId || !title) {
          return {
            title: "Task",
          };
        }

        return {
          id: `task-${taskId}`,
          title: `Task: ${title}`,
          duration: { minutes: defaultTaskTimeblockMinutes },
          extendedProps: {
            source: "task",
            taskId,
          },
        };
      },
    });

    return () => {
      draggable.destroy();
    };
  }, [backlogTaskGroups, defaultTaskTimeblockMinutes]);

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
          Boolean(taskTimeblocks[task.id]) && isValidIsoDate(task.dueDate),
      )
      .map((task) => {
        const block = taskTimeblocks[task.id];
        const hasBlock =
          Boolean(block?.start && block?.end) &&
          isValidIsoDate(block.start) &&
          isValidIsoDate(block.end);

        return {
          id: `task-${task.id}`,
          title: `Task: ${task.title}`,
          start: hasBlock ? block.start : task.dueDate,
          end: hasBlock ? block.end : undefined,
          allDay: !hasBlock,
          editable: true,
          durationEditable: true,
          backgroundColor: "#7c3aed",
          borderColor: "#7c3aed",
          textColor: "#ffffff",
          extendedProps: {
            source: "task",
            taskId: task.id,
          },
        };
      });

    return [...meetingEvents, ...taskEvents, ...googleEvents];
  }, [
    googleEvents,
    meetingsState.entities,
    meetingsState.ids,
    taskTimeblocks,
    tasksState.entities,
    tasksState.ids,
  ]);

  const onTaskEventReceive = useCallback(
    async (receiveInfo: EventReceiveArg) => {
      const source =
        (receiveInfo.event.extendedProps.source as
          | "meeting"
          | "task"
          | "google"
          | undefined) ?? "unknown";

      if (source !== "task") {
        receiveInfo.revert();
        return;
      }

      const taskId =
        (receiveInfo.event.extendedProps.taskId as string | undefined) ??
        receiveInfo.event.id.replace(/^task-/, "");
      const eventStart = receiveInfo.event.start;

      if (!taskId || !eventStart) {
        receiveInfo.revert();
        return;
      }

      const normalizedStart = new Date(eventStart);
      if (receiveInfo.event.allDay) {
        normalizedStart.setHours(9, 0, 0, 0);
      }

      const startIso = normalizedStart.toISOString();
      const endDate = receiveInfo.event.end
        ? new Date(receiveInfo.event.end)
        : addMinutesToDate(normalizedStart, defaultTaskTimeblockMinutes);
      const endIso = endDate.toISOString();

      try {
        await dispatch(
          dataThunks.tasks.updateOne({
            id: taskId,
            input: {
              dueDate: startIso,
            },
          }),
        ).unwrap();

        upsertTaskTimeblock(taskId, {
          start: startIso,
          end: endIso,
        });

        setGoogleStatus("Task timeblocked.");
      } catch {
        receiveInfo.revert();
        setGoogleStatus("Failed to timeblock task.");
      }
    },
    [defaultTaskTimeblockMinutes, dispatch, upsertTaskTimeblock],
  );

  const onCalendarEventChange = useCallback(
    async (changeInfo: EventChangeArg) => {
      const source =
        (changeInfo.event.extendedProps.source as
          | "meeting"
          | "task"
          | "google"
          | undefined) ?? "unknown";

      if (source !== "task") {
        changeInfo.revert();
        return;
      }

      const taskId =
        (changeInfo.event.extendedProps.taskId as string | undefined) ??
        changeInfo.event.id.replace(/^task-/, "");
      const nextStart = changeInfo.event.start;
      const nextEnd = changeInfo.event.end;

      if (!taskId || !nextStart) {
        changeInfo.revert();
        return;
      }

      const startIso = nextStart.toISOString();
      const endIso = nextEnd
        ? nextEnd.toISOString()
        : addMinutes(startIso, defaultTaskTimeblockMinutes);

      try {
        await dispatch(
          dataThunks.tasks.updateOne({
            id: taskId,
            input: {
              dueDate: startIso,
            },
          }),
        ).unwrap();

        upsertTaskTimeblock(taskId, {
          start: startIso,
          end: endIso,
        });
      } catch {
        changeInfo.revert();
        setGoogleStatus("Failed to update task timeblock.");
      }
    },
    [defaultTaskTimeblockMinutes, dispatch, upsertTaskTimeblock],
  );

  useEffect(() => {
    if (!selectedEvent || selectedEvent.source !== "task") {
      setTaskDialogStartValue("");
      setTaskDialogEndValue("");
      return;
    }

    setTaskDialogStartValue(toDateTimeLocalValue(selectedEvent.startIso));
    setTaskDialogEndValue(toDateTimeLocalValue(selectedEvent.endIso));
  }, [selectedEvent]);

  const saveTaskDialogTimeblock = useCallback(async () => {
    if (!selectedEvent?.taskId) {
      return;
    }

    const startIso = fromDateTimeLocalValue(taskDialogStartValue);
    const endIso = fromDateTimeLocalValue(taskDialogEndValue);

    if (!startIso || !endIso) {
      setGoogleStatus("Start and end time are required.");
      return;
    }

    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setGoogleStatus("End time must be after start time.");
      return;
    }

    setIsSavingTaskDialogTime(true);
    try {
      await dispatch(
        dataThunks.tasks.updateOne({
          id: selectedEvent.taskId,
          input: {
            dueDate: startIso,
          },
        }),
      ).unwrap();

      upsertTaskTimeblock(selectedEvent.taskId, {
        start: startIso,
        end: endIso,
      });

      setSelectedEvent((current) =>
        current
          ? {
              ...current,
              startIso,
              endIso,
              startText: formatEventDateTime(new Date(startIso)),
              endText: formatEventDateTime(new Date(endIso)),
            }
          : current,
      );
      setGoogleStatus("Task timeblock updated.");
    } catch {
      setGoogleStatus("Failed to update task timeblock.");
    } finally {
      setIsSavingTaskDialogTime(false);
    }
  }, [
    dispatch,
    selectedEvent,
    taskDialogEndValue,
    taskDialogStartValue,
    upsertTaskTimeblock,
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

      <div className="mt-5 flex min-h-0 flex-1 gap-4">
        <Card className="h-full w-80 shrink-0">
          <CardContent className="flex h-full min-h-[620px] flex-col p-3">
            <h3 className="text-sm font-semibold">Task Backlog</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              Drag Next Action and In Progress tasks onto the calendar to
              timeblock them.
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Default duration: {defaultTaskTimeblockMinutes} minutes.
            </p>

            <div
              ref={backlogContainerRef}
              className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
            >
              {backlogTaskGroups.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No eligible tasks to timeblock.
                </p>
              ) : (
                backlogTaskGroups.map((group) => (
                  <div key={group.projectName} className="space-y-1.5">
                    <h4 className="text-muted-foreground text-xs font-medium uppercase">
                      {group.projectName}
                    </h4>
                    <div className="space-y-1">
                      {group.tasks.map((task) => (
                        <div
                          key={task.id}
                          data-task-id={task.id}
                          data-task-title={task.title}
                          className="task-backlog-item bg-muted cursor-grab rounded-md border px-2 py-1.5 text-xs"
                        >
                          {task.title}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-0 flex-1">
          <CardContent className="h-full min-h-[620px] p-3">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={calendarInitialView}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              height="100%"
              editable
              eventDurationEditable
              droppable
              nowIndicator
              slotDuration="00:10:00"
              snapDuration="00:10:00"
              forceEventDuration
              defaultTimedEventDuration="00:30:00"
              eventMinHeight={24}
              datesSet={(arg: DatesSetArg) => {
                saveLastCalendarView(arg.view.type);
              }}
              eventReceive={onTaskEventReceive}
              eventChange={onCalendarEventChange}
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
                  taskId:
                    source === "task"
                      ? ((arg.event.extendedProps.taskId as
                          | string
                          | undefined) ?? arg.event.id.replace(/^task-/, ""))
                      : undefined,
                  startIso: arg.event.start?.toISOString(),
                  endIso: arg.event.end?.toISOString(),
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
      </div>

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
              {selectedEvent.source === "task" && selectedEvent.taskId ? (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Start</label>
                    <input
                      type="datetime-local"
                      value={taskDialogStartValue}
                      onChange={(event) =>
                        setTaskDialogStartValue(event.target.value)
                      }
                      className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm focus-visible:ring-[3px] focus-visible:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium">End</label>
                    <input
                      type="datetime-local"
                      value={taskDialogEndValue}
                      onChange={(event) =>
                        setTaskDialogEndValue(event.target.value)
                      }
                      className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm focus-visible:ring-[3px] focus-visible:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isSavingTaskDialogTime}
                      onClick={() => {
                        void saveTaskDialogTimeblock();
                      }}
                    >
                      {isSavingTaskDialogTime ? "Saving..." : "Save time"}
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        removeTaskTimeblock(selectedEvent.taskId!);
                        setSelectedEvent(null);
                        setGoogleStatus("Task timeblock removed.");
                      }}
                    >
                      Remove timeblock
                    </Button>
                  </div>
                </div>
              ) : null}
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
