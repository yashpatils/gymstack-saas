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

  return session.session;
}

