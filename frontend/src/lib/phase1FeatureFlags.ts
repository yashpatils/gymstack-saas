import type { EffectiveFeatureFlags } from './featureFlags';

export const PHASE1_FEATURE_FLAG_KEYS = {
  email2sv: 'FEATURE_EMAIL_2SV',
  secureProfileUpdates: 'FEATURE_SECURE_PROFILE_UPDATES',
  tenantSlugEditor: 'FEATURE_TENANT_SLUG_EDITOR',
  publicSiteAutoprovision: 'FEATURE_PUBLIC_SITE_AUTOPROVISION',
  roleOnboardingV2: 'FEATURE_ROLE_ONBOARDING_V2',
} as const;

export const phase1FeatureFlagDefaults: EffectiveFeatureFlags = {
  FEATURE_EMAIL_2SV: false,
  FEATURE_SECURE_PROFILE_UPDATES: false,
  FEATURE_TENANT_SLUG_EDITOR: false,
  FEATURE_PUBLIC_SITE_AUTOPROVISION: false,
  FEATURE_ROLE_ONBOARDING_V2: false,
};

export function getPhase1FeatureFlags(flags: EffectiveFeatureFlags | null | undefined): EffectiveFeatureFlags {
  return {
    FEATURE_EMAIL_2SV: Boolean(flags?.FEATURE_EMAIL_2SV ?? phase1FeatureFlagDefaults.FEATURE_EMAIL_2SV),
    FEATURE_SECURE_PROFILE_UPDATES: Boolean(
      flags?.FEATURE_SECURE_PROFILE_UPDATES ?? phase1FeatureFlagDefaults.FEATURE_SECURE_PROFILE_UPDATES,
    ),
    FEATURE_TENANT_SLUG_EDITOR: Boolean(
      flags?.FEATURE_TENANT_SLUG_EDITOR ?? phase1FeatureFlagDefaults.FEATURE_TENANT_SLUG_EDITOR,
    ),
    FEATURE_PUBLIC_SITE_AUTOPROVISION: Boolean(
      flags?.FEATURE_PUBLIC_SITE_AUTOPROVISION ?? phase1FeatureFlagDefaults.FEATURE_PUBLIC_SITE_AUTOPROVISION,
    ),
    FEATURE_ROLE_ONBOARDING_V2: Boolean(
      flags?.FEATURE_ROLE_ONBOARDING_V2 ?? phase1FeatureFlagDefaults.FEATURE_ROLE_ONBOARDING_V2,
    ),
  };
}
