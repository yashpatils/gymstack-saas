import { ApiFetchError, apiFetch } from './apiFetch';
import type { ActiveContext, AuthLoginResponse, AuthMeResponse, AuthUser } from '../types/auth';

const TOKEN_STORAGE_KEY = 'gymstack_token';

export type { AuthUser, AuthMeResponse, ActiveContext };
export type SignupRole = 'OWNER' | 'ADMIN' | 'USER';

export function getToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

function setToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const secureAttribute = window.location.protocol === 'https:' ? '; Secure' : '';

  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  document.cookie = `gymstack_token=${token}; Path=/; SameSite=Lax${secureAttribute}`;
}

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser; activeContext?: ActiveContext; memberships: AuthMeResponse['memberships'] }> {
  const data = await apiFetch<AuthLoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  setToken(data.accessToken);
  return {
    token: data.accessToken,
    user: data.user,
    activeContext: data.activeContext,
    memberships: data.memberships,
  };
}

export async function signup(email: string, password: string, role?: SignupRole): Promise<{ token: string; user: AuthUser; activeContext?: ActiveContext; memberships: AuthMeResponse['memberships'] }> {
  const data = await apiFetch<AuthLoginResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  setToken(data.accessToken);
  return {
    token: data.accessToken,
    user: data.user,
    activeContext: data.activeContext,
    memberships: data.memberships,
  };
}

export async function resendVerification(email: string): Promise<{ ok: true; message: string }> {
  return apiFetch<{ ok: true; message: string }>('/api/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function verifyEmail(token: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function requestDeleteAccount(password: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>('/api/account/request-delete', {
    method: 'POST',
    body: JSON.stringify({ password }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function confirmDeleteAccount(token: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>('/api/account/confirm-delete', {
    method: 'POST',
    body: JSON.stringify({ token }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function acceptInvite(params: { token: string; password?: string; email?: string; name?: string }): Promise<{ token: string; user: AuthUser; activeContext?: ActiveContext; memberships: AuthMeResponse['memberships'] }> {
  const data = await apiFetch<AuthLoginResponse>('/api/invites/accept', {
    method: 'POST',
    body: JSON.stringify(params),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  setToken(data.accessToken);
  return {
    token: data.accessToken,
    user: data.user,
    activeContext: data.activeContext,
    memberships: data.memberships,
  };
}

export async function setContext(tenantId: string, gymId?: string): Promise<{ token: string }> {
  const data = await apiFetch<{ accessToken: string }>('/api/auth/set-context', {
    method: 'POST',
    body: JSON.stringify({ tenantId, gymId }),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  setToken(data.accessToken);
  return { token: data.accessToken };
}


export async function setMode(tenantId: string, mode: 'OWNER' | 'MANAGER', locationId?: string): Promise<AuthMeResponse> {
  return apiFetch<AuthMeResponse>('/api/auth/set-mode', {
    method: 'POST',
    body: JSON.stringify({ tenantId, mode, locationId }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}


export async function setOwnerOpsMode(payload: {
  tenantId: string;
  locationId: string;
  choice: 'OWNER_IS_MANAGER' | 'INVITE_MANAGER';
  managerEmail?: string;
  managerName?: string;
}): Promise<{ ok: true; mode?: 'MANAGER'; inviteUrl?: string; role?: 'TENANT_LOCATION_ADMIN'; emailSent?: boolean }> {
  return apiFetch<{ ok: true; mode?: 'MANAGER'; inviteUrl?: string; role?: 'TENANT_LOCATION_ADMIN'; emailSent?: boolean }>('/api/onboarding/owner-ops-mode', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function oauthStartUrl(provider: 'google' | 'apple', mode: 'login' | 'link' = 'login', returnTo?: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? '';
  const url = new URL(`/api/auth/oauth/${provider}/start`, base || window.location.origin);
  url.searchParams.set('mode', mode);
  url.searchParams.set('returnTo', returnTo ?? window.location.href);
  return url.toString();
}

export async function me(): Promise<AuthMeResponse> {
  try {
    return await apiFetch<AuthMeResponse>('/api/auth/me', { method: 'GET' });
  } catch (error) {
    if (error instanceof ApiFetchError && error.statusCode === 401) {
      logout();
    }
    throw error;
  }
}

export function logout(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const secureAttribute = window.location.protocol === 'https:' ? '; Secure' : '';

  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  document.cookie = `gymstack_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secureAttribute}`;
}
