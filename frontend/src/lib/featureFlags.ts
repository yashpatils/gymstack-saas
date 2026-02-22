import { apiFetch } from './apiFetch';
import { phase1FeatureFlagDefaults } from './phase1FeatureFlags';

export type EffectiveFeatureFlags = Record<string, boolean>;
export type FeatureFlags = EffectiveFeatureFlags;

export const defaultFeatureFlags: FeatureFlags = { ...phase1FeatureFlagDefaults };

export async function getEffectiveFeatureFlags(): Promise<EffectiveFeatureFlags> {
  const flags = await apiFetch<EffectiveFeatureFlags>('/api/feature-flags', { method: 'GET', cache: 'no-store' });
  return flags;
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  try {
    const flags = await getEffectiveFeatureFlags();
    return { ...defaultFeatureFlags, ...flags };
  } catch {
    return { ...defaultFeatureFlags };
  }
}

export function isFeatureEnabled(flags: EffectiveFeatureFlags | null | undefined, key: string): boolean {
  return Boolean(flags?.[key]);
}
