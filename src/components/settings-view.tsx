import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useTheme } from "@/components/theme-provider";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  type AppSettings,
  loadAppSettings,
  saveAppSettings,
} from "@/lib/app-settings";
import {
  getQueuedNoteLinkCount,
  processNoteLinkQueue,
} from "@/lib/note-linking-queue";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

const SETTINGS_SECTIONS = [
  "General",
  "Style",
  "Connections",
  "Notifications",
  "Account",
  "Billing",
] as const;

type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

const DEFAULT_PAGE_OPTIONS = [
  { label: "Dashboard", value: "/dashboard" },
  { label: "Notes", value: "/notes" },
  { label: "Tasks", value: "/tasks" },
  { label: "Meetings", value: "/meetings" },
  { label: "Calendar", value: "/calendar" },
  { label: "Projects", value: "/projects" },
  { label: "Graph", value: "/graph" },
];

export function SettingsView({
  open,
  onOpenChange,
  activeSection,
  onSectionChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="inset-0 h-full max-h-none w-full max-w-none rounded-none border-0 p-0"
        >
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>
              Manage app configuration and preferences.
            </SheetDescription>
          </SheetHeader>

          <SettingsBody
            activeSection={activeSection}
            onSectionChange={onSectionChange}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[75vh] w-[75vw] max-w-none overflow-hidden p-0"
        showCloseButton
      >
        <div className="sr-only">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage app configuration and preferences.
          </DialogDescription>
        </div>

        <SettingsBody
          activeSection={activeSection}
          onSectionChange={onSectionChange}
        />
      </DialogContent>
    </Dialog>
  );
}

function SettingsBody({
  activeSection,
  onSectionChange,
}: {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}) {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(() =>
    loadAppSettings(),
  );
  const [queuedLinkCount, setQueuedLinkCount] = useState(0);
  const [isProcessingLinks, setIsProcessingLinks] = useState(false);
  const [linkProcessingStatus, setLinkProcessingStatus] = useState<
    string | null
  >(null);

  const updateSettings = useCallback(
    (updater: (current: AppSettings) => AppSettings) => {
      setSettings((current) => {
        const next = updater(current);
        saveAppSettings(next);
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    setQueuedLinkCount(getQueuedNoteLinkCount());
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.style.fontSize = `${settings.fontScale}%`;
    root.classList.toggle("compact-ui", settings.compactMode);
  }, [settings.compactMode, settings.fontScale]);

  return (
    <div className="grid h-full min-h-0 grid-cols-[180px_1fr] md:grid-cols-[240px_1fr]">
      <aside className="bg-muted/20 border-r p-3">
        <h3 className="px-2 py-1 text-sm font-semibold">Settings</h3>
        <nav className="mt-2 space-y-1">
          {SETTINGS_SECTIONS.map((section) => (
            <Button
              key={section}
              type="button"
              variant={activeSection === section ? "secondary" : "ghost"}
              className={cn("w-full justify-start")}
              onClick={() => onSectionChange(section)}
            >
              {section}
            </Button>
          ))}
        </nav>
      </aside>

      <main className="min-h-0 overflow-y-auto p-6">
        <h2 className="text-2xl font-semibold tracking-tight">
          {activeSection}
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Manage {activeSection.toLowerCase()} preferences.
        </p>

        {activeSection === "General" ? (
          <div className="mt-5 space-y-4">
            <Card>
              <CardContent className="space-y-4 p-4">
                <h3 className="text-sm font-semibold">Startup</h3>
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs">
                    Default landing page when opening the app.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_PAGE_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        size="sm"
                        variant={
                          settings.defaultPage === option.value
                            ? "secondary"
                            : "outline"
                        }
                        onClick={() =>
                          updateSettings((current) => ({
                            ...current,
                            defaultPage: option.value,
                          }))
                        }
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-4">
                <h3 className="text-sm font-semibold">Behavior</h3>

                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.confirmBeforeDelete}
                    onChange={(event) =>
                      updateSettings((current) => ({
                        ...current,
                        confirmBeforeDelete: event.target.checked,
                      }))
                    }
                    className="size-4"
                  />
                  Confirm before destructive actions
                </label>

                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.compactMode}
                    onChange={(event) =>
                      updateSettings((current) => ({
                        ...current,
                        compactMode: event.target.checked,
                      }))
                    }
                    className="size-4"
                  />
                  Compact density mode
                </label>

                <div className="space-y-2">
                  <label className="text-xs font-medium">
                    Default task timeblock duration
                  </label>
                  <select
                    value={String(settings.taskTimeblockDefaultMinutes)}
                    onChange={(event) =>
                      updateSettings((current) => ({
                        ...current,
                        taskTimeblockDefaultMinutes:
                          Number(event.target.value) || 30,
                      }))
                    }
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm focus-visible:ring-[3px] focus-visible:outline-none"
                  >
                    <option value="10">10 minutes</option>
                    <option value="20">20 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="40">40 minutes</option>
                    <option value="50">50 minutes</option>
                    <option value="60">60 minutes</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {activeSection === "Style" ? (
          <div className="mt-5 space-y-4">
            <Card>
              <CardContent className="space-y-4 p-4">
                <h3 className="text-sm font-semibold">Theme</h3>
                <div className="flex flex-wrap gap-2">
                  {(["light", "dark", "system"] as const).map((option) => (
                    <Button
                      key={option}
                      type="button"
                      size="sm"
                      variant={theme === option ? "secondary" : "outline"}
                      onClick={() => setTheme(option)}
                      className="capitalize"
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-4">
                <h3 className="text-sm font-semibold">Typography</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Font scale</span>
                    <span>{settings.fontScale}%</span>
                  </div>
                  <input
                    type="range"
                    min={90}
                    max={120}
                    step={5}
                    value={settings.fontScale}
                    onChange={(event) =>
                      updateSettings((current) => ({
                        ...current,
                        fontScale: Number(event.target.value),
                      }))
                    }
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {activeSection === "Connections" ? (
          <div className="mt-5 space-y-4">
            <Card>
              <CardContent className="space-y-3 p-4">
                <h3 className="text-sm font-semibold">Google Calendar</h3>
                <p className="text-muted-foreground text-xs">
                  Configure Google Calendar sync credentials. Values are stored
                  only on this device.
                </p>
                <p className="text-muted-foreground text-xs">
                  Use an OAuth client of type <strong>Web application</strong>
                  (not Desktop). Add your app origin to Authorized JavaScript
                  origins (for local dev: http://localhost:5173).
                </p>

                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.googleCalendarEnabled}
                    onChange={(event) =>
                      updateSettings((current) => ({
                        ...current,
                        googleCalendarEnabled: event.target.checked,
                      }))
                    }
                    className="size-4"
                  />
                  Enable Google Calendar connection
                </label>

                <div className="space-y-2">
                  <label className="text-xs font-medium">
                    Google OAuth Client ID
                  </label>
                  <input
                    type="text"
                    value={settings.googleCalendarClientId}
                    onChange={(event) =>
                      updateSettings((current) => ({
                        ...current,
                        googleCalendarClientId: event.target.value,
                      }))
                    }
                    placeholder="Enter Google OAuth client ID"
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm focus-visible:ring-[3px] focus-visible:outline-none"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium">Google API Key</label>
                  <input
                    type="password"
                    value={settings.googleCalendarApiKey}
                    onChange={(event) =>
                      updateSettings((current) => ({
                        ...current,
                        googleCalendarApiKey: event.target.value,
                      }))
                    }
                    placeholder="Enter Google API key"
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm focus-visible:ring-[3px] focus-visible:outline-none"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <p className="text-muted-foreground text-xs">
                    Optional for now. OAuth access token is used for calendar
                    import requests.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium">Calendar ID</label>
                  <input
                    type="text"
                    value={settings.googleCalendarCalendarId}
                    onChange={(event) =>
                      updateSettings((current) => ({
                        ...current,
                        googleCalendarCalendarId: event.target.value,
                      }))
                    }
                    placeholder="primary"
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm focus-visible:ring-[3px] focus-visible:outline-none"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <p className="text-muted-foreground text-xs">
                    Use <strong>primary</strong> or the calendar's ID from
                    Google Calendar settings (not the calendar display name).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateSettings((current) => ({
                        ...current,
                        googleCalendarEnabled: false,
                        googleCalendarClientId: "",
                        googleCalendarApiKey: "",
                        googleCalendarCalendarId: "primary",
                      }))
                    }
                  >
                    Clear calendar config
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-4">
                <h3 className="text-sm font-semibold">AI Providers</h3>
                <p className="text-muted-foreground text-xs">
                  Google AI Studio API key is stored only on this device and
                  sent at runtime to your local backend. It is not written to
                  source files.
                </p>

                <div className="space-y-2">
                  <label className="text-xs font-medium">Gemini API Key</label>
                  <input
                    type="password"
                    value={settings.googleAiStudioApiKey}
                    onChange={(event) =>
                      updateSettings((current) => ({
                        ...current,
                        googleAiStudioApiKey: event.target.value,
                      }))
                    }
                    placeholder="Enter Google AI Studio API key"
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm focus-visible:ring-[3px] focus-visible:outline-none"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateSettings((current) => ({
                        ...current,
                        googleAiStudioApiKey: "",
                      }))
                    }
                  >
                    Clear key
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-4">
                <h3 className="text-sm font-semibold">Auto Note Linking</h3>
                <p className="text-muted-foreground text-xs">
                  Queue note updates and process semantic linking on a schedule.
                </p>

                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.noteLinkScheduleEnabled}
                    onChange={(event) =>
                      updateSettings((current) => ({
                        ...current,
                        noteLinkScheduleEnabled: event.target.checked,
                      }))
                    }
                    className="size-4"
                  />
                  Enable scheduled processing
                </label>

                <div className="space-y-1">
                  <label className="text-xs font-medium">
                    Daily processing time
                  </label>
                  <input
                    type="time"
                    value={settings.noteLinkScheduleTime}
                    onChange={(event) =>
                      updateSettings((current) => ({
                        ...current,
                        noteLinkScheduleTime: event.target.value,
                      }))
                    }
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border bg-transparent px-3 py-1 text-sm focus-visible:ring-[3px] focus-visible:outline-none"
                  />
                </div>

                <div className="text-muted-foreground text-xs">
                  {queuedLinkCount} note{queuedLinkCount === 1 ? "" : "s"} in
                  queue.
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isProcessingLinks}
                    onClick={() => {
                      setIsProcessingLinks(true);
                      setLinkProcessingStatus(null);

                      void processNoteLinkQueue()
                        .then((result) => {
                          setQueuedLinkCount(result.remaining);
                          setLinkProcessingStatus(
                            `Processed ${result.processed} note${
                              result.processed === 1 ? "" : "s"
                            } · Updated ${result.updated} · Failed ${result.failed}`,
                          );
                        })
                        .catch((error) => {
                          setLinkProcessingStatus(
                            error instanceof Error
                              ? error.message
                              : "Failed to process link queue",
                          );
                        })
                        .finally(() => {
                          setIsProcessingLinks(false);
                        });
                    }}
                  >
                    {isProcessingLinks ? "Processing..." : "Process queue now"}
                  </Button>
                </div>

                {linkProcessingStatus ? (
                  <p className="text-muted-foreground text-xs">
                    {linkProcessingStatus}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {["Notifications", "Account", "Billing"].includes(activeSection) ? (
          <div className="mt-5">
            <Card>
              <CardContent className="p-4">
                <p className="text-muted-foreground text-sm">
                  {activeSection} settings are scaffolded and ready for detailed
                  options next.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export type { SettingsSection };
