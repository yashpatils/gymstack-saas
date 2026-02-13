import { apiFetch } from "./apiFetch";

export type FeatureFlags = {
  enableBilling: boolean;
  enableDebugLinks: boolean;
  enableInvites: boolean;
  enableAudit: boolean;
  [key: string]: boolean;
};

export const defaultFeatureFlags: FeatureFlags = {
  enableBilling: true,
  enableDebugLinks: false,
  enableInvites: false,
  enableAudit: true,
};

function toFeatureFlags(value: unknown): FeatureFlags {
  if (typeof value !== "object" || value === null) {
    return defaultFeatureFlags;
  }

  const record = value as Record<string, unknown>;
  const merged: FeatureFlags = { ...defaultFeatureFlags };

  for (const [key, current] of Object.entries(record)) {
    if (typeof current === "boolean") {
      merged[key] = current;
    }
  }

  return merged;
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  try {
    const response = await apiFetch<unknown>("/api/feature-flags", {
      method: "GET",
      cache: "no-store",
    });
    return toFeatureFlags(response);
  } catch {
    try {
      const fallbackResponse = await apiFetch<unknown>("/api/settings", {
        method: "GET",
        cache: "no-store",
      });
      return toFeatureFlags(fallbackResponse);
    } catch {
      return defaultFeatureFlags;
    }
  }
}
