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
