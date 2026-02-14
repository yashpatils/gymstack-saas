import { apiFetch } from "./apiFetch";
import {
  defaultFeatureFlags,
  getFeatureFlags,
  type FeatureFlags,
} from "./featureFlags";

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

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeAppSettings(value: unknown): AppSettings {
  const record = typeof value === "object" && value !== null ? value : {};
  const maybe = record as Partial<AppSettings>;

  return {
    appName: typeof maybe.appName === "string" && maybe.appName.trim() ? maybe.appName : defaultAppSettings.appName,
    supportEmail:
      typeof maybe.supportEmail === "string" && maybe.supportEmail.trim()
        ? maybe.supportEmail
        : defaultAppSettings.supportEmail,
    billingEnabled: toBoolean(maybe.billingEnabled, defaultAppSettings.billingEnabled),
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

export async function updateFeatureFlags(nextValues: Partial<FeatureFlags>): Promise<FeatureFlags> {
  try {
    return await apiFetch<FeatureFlags>("/api/settings", {
      method: "PATCH",
      cache: "no-store",
      body: JSON.stringify(nextValues),
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch {
    const merged: FeatureFlags = { ...defaultFeatureFlags };
    for (const [key, value] of Object.entries(nextValues)) {
      if (typeof value === "boolean") {
        merged[key] = value;
      }
    }
    return merged;
  }
}

export { defaultFeatureFlags, getFeatureFlags, type FeatureFlags };
