export type AppSettings = {
  defaultPage: string;
  confirmBeforeDelete: boolean;
  compactMode: boolean;
  fontScale: number;
  googleAiStudioApiKey: string;
};

export const APP_SETTINGS_STORAGE_KEY = "pkm-settings";

export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultPage: "/dashboard",
  confirmBeforeDelete: true,
  compactMode: false,
  fontScale: 100,
  googleAiStudioApiKey: "",
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
      googleAiStudioApiKey:
        parsed.googleAiStudioApiKey ??
        DEFAULT_APP_SETTINGS.googleAiStudioApiKey,
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
}
