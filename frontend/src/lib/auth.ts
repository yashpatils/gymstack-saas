import { ApiFetchError, apiFetch, buildApiUrl, configureApiAuth } from './apiFetch';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './auth/tokenStore';
import type { ActiveContext, AuthLoginResponse, AuthMeResponse, AuthUser } from '../types/auth';

let refreshPromise: Promise<string | null> | null = null;

export type { AuthUser, AuthMeResponse, ActiveContext };
export type SignupRole = 'OWNER' | 'ADMIN' | 'USER';

type AuthTokens = { accessToken: string; refreshToken?: string };

function setAuthTokens(tokens: AuthTokens): void {
  setTokens(tokens);
}

export function getToken(): string | null {
  return getAccessToken();
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
        skipAuthRetry: true,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      setAuthTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return data.accessToken;
    } catch (error) {
      if (error instanceof ApiFetchError && (error.statusCode === 401 || error.statusCode === 403)) {
        return null;
      }
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function login(email: string, password: string, options?: { tenantId?: string; tenantSlug?: string }): Promise<{ token: string; user: AuthUser; activeContext?: ActiveContext; memberships: AuthMeResponse['memberships']; emailDeliveryWarning?: string }> {
  const normalizedEmail = email.trim();
  const data = await apiFetch<AuthLoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: normalizedEmail, password, tenantId: options?.tenantId, tenantSlug: options?.tenantSlug }),
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




export async function signup(email: string, password: string, role?: SignupRole, inviteToken?: string): Promise<{ token: string; user: AuthUser; activeContext?: ActiveContext; memberships: AuthMeResponse['memberships']; emailDeliveryWarning?: string }> {
  const data = await apiFetch<AuthLoginResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, role, inviteToken }),
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

export async function resendVerification(email: string): Promise<{ ok: true; message: string; emailDeliveryWarning?: string }> { return apiFetch<{ ok: true; message: string; emailDeliveryWarning?: string }>('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }), headers: { 'Content-Type': 'application/json' } }); }
export async function verifyEmail(token: string): Promise<{ ok: true }> { return apiFetch<{ ok: true }>('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }), headers: { 'Content-Type': 'application/json' } }); }
export async function requestDeleteAccount(password: string): Promise<{ ok: true }> { return apiFetch<{ ok: true }>('/api/account/request-delete', { method: 'POST', body: JSON.stringify({ password }), headers: { 'Content-Type': 'application/json' } }); }
export async function confirmDeleteAccount(token: string): Promise<{ ok: true }> { return apiFetch<{ ok: true }>('/api/account/confirm-delete', { method: 'POST', body: JSON.stringify({ token }), headers: { 'Content-Type': 'application/json' } }); }


export async function getAccountDeletionStatus(): Promise<{ pendingDeletion: boolean; deletionRequestedAt: string | null; deletedAt: string | null }> {
  return apiFetch<{ pendingDeletion: boolean; deletionRequestedAt: string | null; deletedAt: string | null }>('/api/account/deletion-status', { method: 'GET' });
}

export async function cancelAccountDeletion(): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>('/api/account/cancel-deletion', { method: 'POST' });
}

export async function exportTenantData(): Promise<unknown> {
  return apiFetch<unknown>('/api/export/tenant', { method: 'GET' });
}

export async function exportLocationData(locationId: string): Promise<unknown> {
  return apiFetch<unknown>(`/api/export/location/${locationId}`, { method: 'GET' });
}

export async function acceptInvite(params: { token: string; password?: string; email?: string; name?: string }): Promise<{ token: string; user: AuthUser; activeContext?: ActiveContext; memberships: AuthMeResponse['memberships'] }> {
  const data = await apiFetch<AuthLoginResponse>('/api/auth/register-with-invite', { method: 'POST', body: JSON.stringify({ token: params.token, email: params.email, password: params.password, name: params.name }), headers: { 'Content-Type': 'application/json' } });
  setAuthTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return { token: data.accessToken, user: data.user, activeContext: data.activeContext, memberships: data.memberships };
}

export async function setContext(tenantId: string, locationId?: string | null, mode: 'OWNER' | 'MANAGER' = 'OWNER'): Promise<{ token: string; me: AuthMeResponse }> {
  const data = await apiFetch<{ accessToken: string; me: AuthMeResponse }>('/api/auth/set-context', { method: 'POST', body: JSON.stringify({ tenantId, locationId: locationId ?? null, mode }), headers: { 'Content-Type': 'application/json' } });
  setTokens({ accessToken: data.accessToken });
  return { token: data.accessToken, me: data.me };
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



export function applyOAuthTokens(tokens: { accessToken: string; refreshToken?: string }): void {
  setTokens(tokens);
}

export function applyOAuthToken(token: string): void {
  applyOAuthTokens({ accessToken: token });
}

export async function getMe(): Promise<AuthMeResponse> {
  return apiFetch<AuthMeResponse>('/api/auth/me', { method: 'GET', cache: 'no-store' });
}

export function logout(): void {
  clearTokens();
}

configureApiAuth(
  refreshAccessToken,
  () => {
    logout();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gymstack:session-expired'));
    }
  },
);


export const me = getMe;
