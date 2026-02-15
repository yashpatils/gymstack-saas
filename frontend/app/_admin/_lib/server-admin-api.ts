import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { buildApiUrl } from '../../../src/lib/apiFetch';
import type { AuthMeResponse } from '../../../src/types/auth';

const ADMIN_LOGIN_REDIRECT = 'https://admin.gymstack.club/login?next=/';
const ADMIN_RESTRICTED_REDIRECT = 'https://admin.gymstack.club/login?error=restricted';

export async function getAdminSessionOrRedirect(): Promise<AuthMeResponse> {
  const token = cookies().get('gymstack_token')?.value;
  if (!token) {
    redirect(ADMIN_LOGIN_REDIRECT);
  }

  const response = await fetch(buildApiUrl('/api/auth/me'), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    redirect(ADMIN_LOGIN_REDIRECT);
  }

  const session = (await response.json()) as AuthMeResponse;
  if (session.platformRole !== 'PLATFORM_ADMIN') {
    redirect(ADMIN_RESTRICTED_REDIRECT);
  }

  return session;
}

export async function adminApiFetch<T>(path: string): Promise<T> {
  const token = cookies().get('gymstack_token')?.value;
  if (!token) {
    redirect(ADMIN_LOGIN_REDIRECT);
  }

  const response = await fetch(buildApiUrl(path), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    redirect(ADMIN_LOGIN_REDIRECT);
  }

  if (!response.ok) {
    throw new Error(`Failed admin API request (${response.status})`);
  }

  return (await response.json()) as T;
}
