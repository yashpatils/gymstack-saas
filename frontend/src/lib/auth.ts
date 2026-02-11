import { apiFetch } from './api';

const TOKEN_STORAGE_KEY = 'gymstack_token';

export type AuthUser = {
  id: string;
  email: string;
  role: string;
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
}

export async function login(
  email: string,
  password: string,
): Promise<{ token: string; user: AuthUser }> {
  const data = await apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  setToken(data.accessToken);

  return {
    token: data.accessToken,
    user: data.user,
  };
}

export async function signup(
  email: string,
  password: string,
): Promise<{ token: string; user: AuthUser }> {
  const data = await apiFetch<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  setToken(data.accessToken);

  return {
    token: data.accessToken,
    user: data.user,
  };
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
}
