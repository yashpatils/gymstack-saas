import { apiFetch } from "./api";

const SETTINGS_STORAGE_KEY = "gymstack_app_settings";

export type AppSettings = {
  appName: string;
  supportEmail: string;
  billingEnabled: boolean;
};

export const defaultAppSettings: AppSettings = {
  appName: "GymStack",
  supportEmail: "support@example.com",
  billingEnabled: false,
};

export type FeatureFlags = {
  enableBilling: boolean;
  enableInvites: boolean;
  enableAudit: boolean;
};

export const defaultFeatureFlags: FeatureFlags = {
  enableBilling: false,
  enableInvites: false,
  enableAudit: true,
};

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeAppSettings(value: unknown): AppSettings {
  const maybe = typeof value === "object" && value !== null ? (value as Partial<AppSettings>) : {};

  return {
    appName: typeof maybe.appName === "string" && maybe.appName.trim() ? maybe.appName : defaultAppSettings.appName,
    supportEmail:
      typeof maybe.supportEmail === "string" && maybe.supportEmail.trim()
        ? maybe.supportEmail
        : defaultAppSettings.supportEmail,
    billingEnabled: toBoolean(maybe.billingEnabled, defaultAppSettings.billingEnabled),
  };
}

function normalizeFlags(value: unknown): FeatureFlags {
  const maybe = typeof value === "object" && value !== null ? (value as Partial<FeatureFlags>) : {};

  return {
    enableBilling: toBoolean(maybe.enableBilling, defaultFeatureFlags.enableBilling),
    enableInvites: toBoolean(maybe.enableInvites, defaultFeatureFlags.enableInvites),
    enableAudit: toBoolean(maybe.enableAudit, defaultFeatureFlags.enableAudit),
  };
}

export async function getSettings(): Promise<AppSettings> {
  if (typeof window === "undefined") {
    return defaultAppSettings;
  }

  const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!raw) {
    return defaultAppSettings;
  }

  try {
    const parsed = JSON.parse(raw);
    return normalizeAppSettings(parsed);
  } catch {
    return defaultAppSettings;
  }
}

export async function saveSettings(next: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const merged = normalizeAppSettings({ ...current, ...next });

  if (typeof window !== "undefined") {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
  }

  return merged;
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  const response = await apiFetch<unknown>("/api/settings", {
    method: "GET",
    cache: "no-store",
  });

  return normalizeFlags(response);
}

export async function updateFeatureFlags(nextValues: Partial<FeatureFlags>): Promise<FeatureFlags> {
  const response = await apiFetch<unknown>("/api/settings", {
    method: "PATCH",
    cache: "no-store",
    body: nextValues,
  });

  return normalizeFlags(response);
}
