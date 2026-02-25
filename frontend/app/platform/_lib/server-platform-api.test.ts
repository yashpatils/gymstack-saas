import { describe, expect, it } from 'vitest';
import { hasPlatformStaffAccess } from './server-platform-api';
import type { AuthMeResponse } from '../../../src/types/auth';

function createSession(memberships: AuthMeResponse['memberships']): AuthMeResponse {
  return {
    user: { id: 'user_1', email: 'test@example.com' },
    memberships,
    activeContext: { tenantId: null, role: null },
    permissions: [],
    context: {
      tenant: { id: null, name: null },
      location: { id: null, name: null },
    },
    billing: {
      plan: 'starter',
      trialDaysLeft: 0,
      status: 'FREE',
      gatingSummary: { ok: true, reasonCode: 'OK', wouldBeBlocked: false },
    },
  };
}

describe('hasPlatformStaffAccess', () => {
  it('returns false for client-only canonical memberships', () => {
    const result = hasPlatformStaffAccess(createSession({
      tenant: [],
      location: [{ tenantId: 'tenant_1', locationId: 'loc_1', role: 'CLIENT' }],
    }));

    expect(result).toBe(false);
  });

  it('returns true for location admin canonical memberships', () => {
    const result = hasPlatformStaffAccess(createSession({
      tenant: [],
      location: [{ tenantId: 'tenant_1', locationId: 'loc_1', role: 'TENANT_LOCATION_ADMIN' }],
    }));

    expect(result).toBe(true);
  });
});
