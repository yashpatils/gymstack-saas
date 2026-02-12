import { apiFetch } from './api';

const TOKEN_STORAGE_KEY = 'gymstack_token';

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  orgId: string;
};

export type AuthMeResponse = AuthUser & {
  subscriptionStatus?: string;
  stripeConfigured?: boolean;
};

type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

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

  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  document.cookie = `gymstack_token=${token}; Path=/; SameSite=Lax; Secure`;
}

export async function login(
  email: string,
  password: string,
): Promise<{ token: string; user: AuthUser }> {
  const data = await apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });

  setToken(data.accessToken);
  return data;
}

export async function signup(
  email: string,
  password: string,
): Promise<{ token: string; user: AuthUser }> {
  const data = await apiFetch<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: { email, password },
  });

  setToken(data.accessToken);
  return data;
}

export async function me(): Promise<AuthUser> {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated.');
  }

  const user = await apiFetch<AuthUser>('/api/auth/me', {
    method: 'GET',
  });

  return user;
}

export function logout(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  document.cookie =
    'gymstack_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure';
}
