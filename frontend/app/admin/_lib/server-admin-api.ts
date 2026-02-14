import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { buildApiUrl } from '../../../src/lib/apiFetch';
import type { AuthMeResponse } from '../../../src/types/auth';

export async function getAdminSessionOrRedirect(): Promise<AuthMeResponse> {
  const token = cookies().get('gymstack_token')?.value;
  if (!token) {
    redirect('/login');
  }

  const response = await fetch(buildApiUrl('/api/auth/me'), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    redirect('/login');
  }

  const session = (await response.json()) as AuthMeResponse;
  if (session.platformRole !== 'PLATFORM_ADMIN') {
    redirect('/platform');
  }

  return session;
}

export async function adminApiFetch<T>(path: string): Promise<T> {
  const token = cookies().get('gymstack_token')?.value;
  if (!token) {
    redirect('/login');
  }

  const response = await fetch(buildApiUrl(path), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    redirect('/login');
  }

  if (response.status === 403) {
    redirect('/platform');
  }

  if (!response.ok) {
    throw new Error(`Failed admin API request (${response.status})`);
  }

  return (await response.json()) as T;
}
