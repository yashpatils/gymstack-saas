import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { buildApiUrl } from '../../../src/lib/apiFetch';
import type { AuthMeResponse } from '../../../src/types/auth';

const ADMIN_HOST = 'admin.gymstack.club';

type AdminSessionState = {
  isAuthenticated: boolean;
  isPlatformAdmin: boolean;
  session: AuthMeResponse | null;
};

function assertAdminHost(): void {
  const host = headers().get('host')?.toLowerCase() ?? '';
  if (host && !host.startsWith(ADMIN_HOST)) {
    redirect('/admin/access-restricted');
  }
}

export async function getAdminSession(): Promise<AdminSessionState> {
  assertAdminHost();
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
    isPlatformAdmin: Boolean(session.isPlatformAdmin || session.platformRole === 'PLATFORM_ADMIN'),
    session,
  };
}

export async function getAdminSessionOrRedirect(): Promise<AuthMeResponse> {
  const session = await getAdminSession();
  if (!session.isAuthenticated) {
    redirect('/login?next=/admin');
  }

  if (!session.isPlatformAdmin || !session.session) {
    redirect('/admin/access-restricted');
  }

  return session.session;
}

export async function adminApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  assertAdminHost();
  const token = cookies().get('gymstack_token')?.value;
  if (!token) {
    redirect('/login?next=/admin');
  }

  const headersInit = new Headers(init?.headers ?? {});
  headersInit.set('Authorization', `Bearer ${token}`);

  const response = await fetch(buildApiUrl(path), {
    method: init?.method ?? 'GET',
    cache: init?.cache ?? 'no-store',
    ...init,
    headers: headersInit,
  });

  if (response.status === 401) {
    redirect('/login?next=/admin');
  }

  if (response.status === 403) {
    redirect('/admin/access-restricted');
  }

  if (!response.ok) {
    throw new Error(`Failed admin API request (${response.status})`);
  }

  return (await response.json()) as T;
}
