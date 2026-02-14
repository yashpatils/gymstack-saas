import { ApiFetchError, apiFetch, buildApiUrl, configureApiAuth } from './apiFetch';
import type { ActiveContext, AuthLoginResponse, AuthMeResponse, AuthUser } from '../types/auth';

const ACCESS_TOKEN_STORAGE_KEY = 'gymstack_token';
const REFRESH_TOKEN_STORAGE_KEY = 'gymstack_refresh_token';

let inMemoryAccessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export type { AuthUser, AuthMeResponse, ActiveContext };
export type SignupRole = 'OWNER' | 'ADMIN' | 'USER';

type AuthTokens = { accessToken: string; refreshToken?: string };

function setStoredAccessToken(token: string): void {
  if (typeof window === 'undefined') {
    inMemoryAccessToken = token;
    return;
  }

  inMemoryAccessToken = token;
  const secureAttribute = window.location.protocol === 'https:' ? '; Secure' : '';
  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  document.cookie = `gymstack_token=${token}; Path=/; SameSite=Lax${secureAttribute}`;
}

function setStoredRefreshToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
}

function setAuthTokens(tokens: AuthTokens): void {
  setStoredAccessToken(tokens.accessToken);
  if (tokens.refreshToken) {
    setStoredRefreshToken(tokens.refreshToken);
  }
}

export function getToken(): string | null {
  if (inMemoryAccessToken) {
    return inMemoryAccessToken;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const stored = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  inMemoryAccessToken = stored;
  return stored;
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    try {
      const data = await apiFetch<{ accessToken: string; refreshToken: string; me: AuthMeResponse }>('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      setAuthTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return data.accessToken;
    } catch {
      logout();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser; activeContext?: ActiveContext; memberships: AuthMeResponse['memberships']; emailDeliveryWarning?: string }> {
  const data = await apiFetch<AuthLoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  setAuthTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return {
    token: data.accessToken,
    user: data.user,
    activeContext: data.activeContext,
    memberships: data.memberships,
    emailDeliveryWarning: data.emailDeliveryWarning,
  };
}

export async function signup(email: string, password: string, role?: SignupRole): Promise<{ token: string; user: AuthUser; activeContext?: ActiveContext; memberships: AuthMeResponse['memberships']; emailDeliveryWarning?: string }> {
  const data = await apiFetch<AuthLoginResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  setAuthTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return {
    token: data.accessToken,
    user: data.user,
    activeContext: data.activeContext,
    memberships: data.memberships,
    emailDeliveryWarning: data.emailDeliveryWarning,
  };
}

export async function resendVerification(email: string): Promise<{ ok: true; message: string }> { return apiFetch<{ ok: true; message: string }>('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }), headers: { 'Content-Type': 'application/json' } }); }
export async function verifyEmail(token: string): Promise<{ ok: true }> { return apiFetch<{ ok: true }>('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }), headers: { 'Content-Type': 'application/json' } }); }
export async function requestDeleteAccount(password: string): Promise<{ ok: true }> { return apiFetch<{ ok: true }>('/api/account/request-delete', { method: 'POST', body: JSON.stringify({ password }), headers: { 'Content-Type': 'application/json' } }); }
export async function confirmDeleteAccount(token: string): Promise<{ ok: true }> { return apiFetch<{ ok: true }>('/api/account/confirm-delete', { method: 'POST', body: JSON.stringify({ token }), headers: { 'Content-Type': 'application/json' } }); }

export async function acceptInvite(params: { token: string; password?: string; email?: string; name?: string }): Promise<{ token: string; user: AuthUser; activeContext?: ActiveContext; memberships: AuthMeResponse['memberships'] }> {
  const data = await apiFetch<AuthLoginResponse>('/api/auth/register-with-invite', { method: 'POST', body: JSON.stringify({ token: params.token, email: params.email, password: params.password, name: params.name }), headers: { 'Content-Type': 'application/json' } });
  setAuthTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return { token: data.accessToken, user: data.user, activeContext: data.activeContext, memberships: data.memberships };
}

export async function setContext(tenantId: string, gymId?: string): Promise<{ token: string }> {
  const data = await apiFetch<{ accessToken: string }>('/api/auth/set-context', { method: 'POST', body: JSON.stringify({ tenantId, gymId }), headers: { 'Content-Type': 'application/json' } });
  setStoredAccessToken(data.accessToken);
  return { token: data.accessToken };
}

export async function setMode(tenantId: string, mode: 'OWNER' | 'MANAGER', locationId?: string): Promise<AuthMeResponse> { return apiFetch<AuthMeResponse>('/api/auth/set-mode', { method: 'POST', body: JSON.stringify({ tenantId, mode, locationId }), headers: { 'Content-Type': 'application/json' } }); }
export async function setOwnerOpsMode(payload: { tenantId: string; locationId: string; choice: 'OWNER_IS_MANAGER' | 'INVITE_MANAGER'; managerEmail?: string; managerName?: string; }): Promise<{ ok: true; mode?: 'MANAGER'; inviteUrl?: string; role?: 'TENANT_LOCATION_ADMIN'; emailSent?: boolean }> { return apiFetch<{ ok: true; mode?: 'MANAGER'; inviteUrl?: string; role?: 'TENANT_LOCATION_ADMIN'; emailSent?: boolean }>('/api/onboarding/owner-ops-mode', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } }); }

export function oauthStartUrl(
  provider: 'google' | 'apple',
  mode: 'login' | 'link' = 'login',
  options?: { returnTo?: string; inviteToken?: string; siteSlug?: string },
): string {
  const url = new URL(buildApiUrl(`/api/auth/oauth/${provider}/start`), window.location.origin);
  url.searchParams.set('mode', mode);
  url.searchParams.set('returnTo', options?.returnTo ?? window.location.href);
  if (options?.inviteToken) {
    url.searchParams.set('inviteToken', options.inviteToken);
  }
  if (options?.siteSlug) {
    url.searchParams.set('siteSlug', options.siteSlug);
  }
  return url.toString();
}


export function applyOAuthToken(token: string): void {
  setStoredAccessToken(token);
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
    inMemoryAccessToken = null;
    return;
  }

  const secureAttribute = window.location.protocol === 'https:' ? '; Secure' : '';
  inMemoryAccessToken = null;
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  document.cookie = `gymstack_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secureAttribute}`;
}

configureApiAuth(
  () => getToken(),
  refreshAccessToken,
  () => {
    logout();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  },
);
