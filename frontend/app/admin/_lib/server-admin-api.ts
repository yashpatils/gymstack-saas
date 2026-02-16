import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { buildApiUrl } from '../../../src/lib/apiFetch';
import type { AuthMeResponse } from '../../../src/types/auth';

type AdminSessionState = {
  isAuthenticated: boolean;
  isPlatformAdmin: boolean;
  session: AuthMeResponse | null;
};

export async function getAdminSession(): Promise<AdminSessionState> {
  const token = cookies().get('gymstack_token')?.value;
  if (!token) {
    return {
      isAuthenticated: false,
      isPlatformAdmin: false,
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
      isPlatformAdmin: false,
      session: null,
    };
  }

  if (!response.ok) {
    throw new Error(`Failed auth session lookup (${response.status})`);
  }

  const session = (await response.json()) as AuthMeResponse;

  return {
    isAuthenticated: true,
    isPlatformAdmin: session.platformRole === 'PLATFORM_ADMIN',
    session,
  };
}

export async function getAdminSessionOrRedirect(): Promise<AuthMeResponse> {
  const session = await getAdminSession();
  if (!session.isAuthenticated) {
    redirect('/login?next=/admin');
  }

  if (!session.isPlatformAdmin || !session.session) {
    redirect('/login?error=restricted');
  }

  return session.session;
}

export async function adminApiFetch<T>(path: string): Promise<T> {
  const token = cookies().get('gymstack_token')?.value;
  if (!token) {
    redirect('/login?next=/admin');
  }

  const response = await fetch(buildApiUrl(path), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    redirect('/login?next=/admin');
  }

  if (response.status === 403) {
    redirect('/login?error=restricted');
  }

  if (!response.ok) {
    throw new Error(`Failed admin API request (${response.status})`);
  }

  return (await response.json()) as T;
}
