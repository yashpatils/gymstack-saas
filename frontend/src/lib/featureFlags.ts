import { apiFetch } from './apiFetch';

export type EffectiveFeatureFlags = Record<string, boolean>;

export async function getEffectiveFeatureFlags(): Promise<EffectiveFeatureFlags> {
  const flags = await apiFetch<EffectiveFeatureFlags>('/api/feature-flags', { method: 'GET', cache: 'no-store' });
  return flags;
}

export function isFeatureEnabled(flags: EffectiveFeatureFlags | null | undefined, key: string): boolean {
  return Boolean(flags?.[key]);
}
