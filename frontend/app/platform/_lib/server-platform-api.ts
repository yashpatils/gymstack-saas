import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { buildApiUrl } from '../../../src/lib/apiFetch';
import type { AuthMeResponse } from '../../../src/types/auth';

type PlatformSessionState = {
  isAuthenticated: boolean;
  session: AuthMeResponse | null;
};

export async function getPlatformSession(): Promise<PlatformSessionState> {
  const token = cookies().get('gymstack_token')?.value;
  if (!token) {
    return {
      isAuthenticated: false,
      session: null,
    };
  }

  const response = await fetch(buildApiUrl('/api/auth/me'), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    return {
      isAuthenticated: false,
      session: null,
    };
  }

  if (!response.ok) {
    throw new Error(`Failed platform session lookup (${response.status})`);
  }

  const session = (await response.json()) as AuthMeResponse;
  return {
    isAuthenticated: true,
    session,
  };
}

export async function getPlatformSessionOrRedirect(): Promise<AuthMeResponse> {
  const session = await getPlatformSession();
  if (!session.isAuthenticated || !session.session) {
    redirect('/login?next=/platform');
  }

  if (!hasPlatformStaffAccess(session.session)) {
    redirect('/client');
  }

  return session.session;
}

export function hasPlatformStaffAccess(session: AuthMeResponse): boolean {
  if (Array.isArray(session.memberships)) {
    return session.memberships.some((membership) => membership.role === 'TENANT_OWNER' || membership.role === 'TENANT_LOCATION_ADMIN' || membership.role === 'GYM_STAFF_COACH');
  }

  return session.memberships.tenant.length > 0 || session.memberships.location.some((membership) => membership.role === 'TENANT_LOCATION_ADMIN' || membership.role === 'GYM_STAFF_COACH');
}
