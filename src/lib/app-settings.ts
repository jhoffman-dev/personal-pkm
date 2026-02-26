import { resolveTaskTimeblockDefaultMinutes } from "@/features/task-timeblocking";

export type AppSettings = {
  defaultPage: string;
  confirmBeforeDelete: boolean;
  compactMode: boolean;
  fontScale: number;
  taskTimeblockDefaultMinutes: number;
  googleAiStudioApiKey: string;
  googleCalendarEnabled: boolean;
  googleCalendarClientId: string;
  googleCalendarApiKey: string;
  googleCalendarCalendarId: string;
  noteLinkScheduleEnabled: boolean;
  noteLinkScheduleTime: string;
};

export const APP_SETTINGS_STORAGE_KEY = "pkm-settings";
export const APP_SETTINGS_UPDATED_EVENT = "pkm-settings-updated";

export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultPage: "/dashboard",
  confirmBeforeDelete: true,
  compactMode: false,
  fontScale: 100,
  taskTimeblockDefaultMinutes: 30,
  googleAiStudioApiKey: "",
  googleCalendarEnabled: false,
  googleCalendarClientId: "",
  googleCalendarApiKey: "",
  googleCalendarCalendarId: "primary",
  noteLinkScheduleEnabled: true,
  noteLinkScheduleTime: "00:00",
};

export function loadAppSettings(): AppSettings {
  if (typeof window === "undefined") {
    return DEFAULT_APP_SETTINGS;
  }

  const raw = window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY);

  if (!raw) {
    return DEFAULT_APP_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      defaultPage: parsed.defaultPage ?? DEFAULT_APP_SETTINGS.defaultPage,
      confirmBeforeDelete:
        parsed.confirmBeforeDelete ?? DEFAULT_APP_SETTINGS.confirmBeforeDelete,
      compactMode: parsed.compactMode ?? DEFAULT_APP_SETTINGS.compactMode,
      fontScale: parsed.fontScale ?? DEFAULT_APP_SETTINGS.fontScale,
      taskTimeblockDefaultMinutes: resolveTaskTimeblockDefaultMinutes(
        typeof parsed.taskTimeblockDefaultMinutes === "number" &&
          Number.isFinite(parsed.taskTimeblockDefaultMinutes)
          ? parsed.taskTimeblockDefaultMinutes
          : DEFAULT_APP_SETTINGS.taskTimeblockDefaultMinutes,
      ),
      googleAiStudioApiKey:
        parsed.googleAiStudioApiKey ??
        DEFAULT_APP_SETTINGS.googleAiStudioApiKey,
      googleCalendarEnabled:
        parsed.googleCalendarEnabled ??
        DEFAULT_APP_SETTINGS.googleCalendarEnabled,
      googleCalendarClientId:
        parsed.googleCalendarClientId ??
        DEFAULT_APP_SETTINGS.googleCalendarClientId,
      googleCalendarApiKey:
        parsed.googleCalendarApiKey ??
        DEFAULT_APP_SETTINGS.googleCalendarApiKey,
      googleCalendarCalendarId:
        parsed.googleCalendarCalendarId ??
        DEFAULT_APP_SETTINGS.googleCalendarCalendarId,
      noteLinkScheduleEnabled:
        parsed.noteLinkScheduleEnabled ??
        DEFAULT_APP_SETTINGS.noteLinkScheduleEnabled,
      noteLinkScheduleTime:
        parsed.noteLinkScheduleTime ??
        DEFAULT_APP_SETTINGS.noteLinkScheduleTime,
    };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export function saveAppSettings(settings: AppSettings): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    APP_SETTINGS_STORAGE_KEY,
    JSON.stringify(settings),
  );

  window.dispatchEvent(new CustomEvent(APP_SETTINGS_UPDATED_EVENT));
}
