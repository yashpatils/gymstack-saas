import { apiFetch } from './api';

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
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeFlags(value: unknown): FeatureFlags {
  const maybe = typeof value === 'object' && value !== null
    ? (value as Partial<FeatureFlags>)
    : {};

  return {
    enableBilling: toBoolean(maybe.enableBilling, defaultFeatureFlags.enableBilling),
    enableInvites: toBoolean(maybe.enableInvites, defaultFeatureFlags.enableInvites),
    enableAudit: toBoolean(maybe.enableAudit, defaultFeatureFlags.enableAudit),
  };
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  const response = await apiFetch<unknown>('/api/settings', {
    method: 'GET',
    cache: 'no-store',
  });

  return normalizeFlags(response);
}

export async function updateFeatureFlags(
  nextValues: Partial<FeatureFlags>,
): Promise<FeatureFlags> {
  const response = await apiFetch<unknown>('/api/settings', {
    method: 'PATCH',
    cache: 'no-store',
    body: nextValues,
  });

  return normalizeFlags(response);
}
