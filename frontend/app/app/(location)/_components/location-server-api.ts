import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { buildApiUrl } from '../../../../src/lib/apiFetch';
import type { AuthMeResponse, MembershipRole } from '../../../../src/types/auth';

type LocationApiError = {
  status: number;
  code?: string;
};

export type LocationSession = {
  auth: AuthMeResponse;
  role: MembershipRole;
  locationId: string;
};

export async function getLocationSession(): Promise<LocationSession> {
  const token = cookies().get('gymstack_token')?.value;
  if (!token) {
    redirect('/login?next=/app');
  }

  const meResponse = await fetch(buildApiUrl('/api/auth/me'), {
    method: 'GET',
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (meResponse.status === 401) {
    redirect('/login?next=/app');
  }

  if (!meResponse.ok) {
    throw new Error(`Failed session lookup (${meResponse.status})`);
  }

  const auth = (await meResponse.json()) as AuthMeResponse;
  const role = auth.activeContext?.role;
  const activeLocationId = auth.activeLocationId ?? auth.activeContext?.locationId ?? null;

  if (!auth.activeContext?.tenantId) {
    redirect('/platform');
  }

  if (!activeLocationId) {
    redirect('/platform/context?error=no_active_location');
  }

  if (!role) {
    redirect('/platform');
  }

  return {
    auth,
    role,
    locationId: activeLocationId,
  };
}

export async function locationApiFetch<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    ...options,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });

  if (response.status === 401) {
    redirect('/login?next=/app');
  }

  if (response.status === 403) {
    redirect('/platform/error?code=ACCESS_RESTRICTED');
  }

  if (response.status === 400) {
    const details = (await response.json()) as { code?: string; message?: string };
    if (details.code === 'NO_ACTIVE_LOCATION') {
      redirect('/platform/context?error=no_active_location');
    }
  }

  if (!response.ok) {
    const details = (await response.json().catch(() => ({ code: undefined }))) as LocationApiError;
    throw new Error(`Location API request failed (${response.status}${details.code ? `:${details.code}` : ''})`);
  }

  return (await response.json()) as T;
}

export function getServerToken(): string {
  const token = cookies().get('gymstack_token')?.value;
  if (!token) {
    redirect('/login?next=/app');
  }
  return token;
}
