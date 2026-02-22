import { getPhase1FeatureFlags, PHASE1_FEATURE_FLAG_DEFAULTS } from './phase1-feature-flags';

describe('phase1 feature flags', () => {
  it('returns defaults when no flags are provided', () => {
    expect(getPhase1FeatureFlags(undefined)).toEqual(PHASE1_FEATURE_FLAG_DEFAULTS);
  });

  it('reads known keys and ignores unknown keys', () => {
    const result = getPhase1FeatureFlags({
      FEATURE_EMAIL_2SV: true,
      FEATURE_TENANT_SLUG_EDITOR: true,
      SOME_OTHER_FLAG: true,
    });

    expect(result).toEqual({
      ...PHASE1_FEATURE_FLAG_DEFAULTS,
      FEATURE_EMAIL_2SV: true,
      FEATURE_TENANT_SLUG_EDITOR: true,
    });
  });
});
