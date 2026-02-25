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
  DEFAULT_APP_SETTINGS,
  loadAppSettings,
  saveAppSettings,
} from "@/lib/app-settings";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

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
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

  useEffect(() => {
    setSettings(loadAppSettings());
  }, []);

  useEffect(() => {
    saveAppSettings(settings);
  }, [settings]);

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
                          setSettings((current) => ({
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
                      setSettings((current) => ({
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
                      setSettings((current) => ({
                        ...current,
                        compactMode: event.target.checked,
                      }))
                    }
                    className="size-4"
                  />
                  Compact density mode
                </label>
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
                      setSettings((current) => ({
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
          <div className="mt-5">
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
                      setSettings((current) => ({
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
                      setSettings((current) => ({
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
