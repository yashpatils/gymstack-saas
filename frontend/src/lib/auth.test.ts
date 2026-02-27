import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetchMock = vi.fn();
const configureApiAuthMock = vi.fn();
const clearTokensMock = vi.fn();
const setTokensMock = vi.fn();

vi.mock('./apiFetch', () => ({
  apiFetch: apiFetchMock,
  buildApiUrl: vi.fn(),
  configureApiAuth: configureApiAuthMock,
  ApiFetchError: class ApiFetchError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

vi.mock('./auth/tokenStore', () => ({
  clearTokens: clearTokensMock,
  getAccessToken: vi.fn(() => null),
  getRefreshToken: vi.fn(),
  setTokens: setTokensMock,
}));

describe('auth lib', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('configures api auth to dispatch session-expired on unauthorized', async () => {
    const eventSpy = vi.fn();
    window.addEventListener('gymstack:session-expired', eventSpy);

    await import('./auth');

    expect(configureApiAuthMock).toHaveBeenCalledTimes(1);
    const [, onUnauthorized] = configureApiAuthMock.mock.calls[0];
    expect(typeof onUnauthorized).toBe('function');

    onUnauthorized();

    expect(clearTokensMock).toHaveBeenCalledTimes(1);
    expect(eventSpy).toHaveBeenCalledTimes(1);
    window.removeEventListener('gymstack:session-expired', eventSpy);
  });

  it('routes admin-only login to admin endpoint with tenant options', async () => {
    apiFetchMock.mockResolvedValueOnce({
      status: 'SUCCESS',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'u_1', email: 'admin@example.com' },
      memberships: [],
    });

    const { login } = await import('./auth');
    await login(' admin@example.com ', 'secret', {
      adminOnly: true,
      tenantId: 'tenant_1',
      tenantSlug: 'acme',
    });

    expect(apiFetchMock).toHaveBeenCalledWith('/api/auth/admin/login', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'secret',
        tenantId: 'tenant_1',
        tenantSlug: 'acme',
      }),
    }));
    expect(setTokensMock).toHaveBeenCalledWith({ accessToken: 'access-token', refreshToken: 'refresh-token' });
  });

  it('returns set-context me payload with token and stores access token', async () => {
    const mePayload = { user: { id: 'u_2' }, memberships: [], permissions: [] };
    apiFetchMock.mockResolvedValueOnce({ accessToken: 'next-token', me: mePayload });

    const { setContext } = await import('./auth');
    const result = await setContext('tenant_1', 'location_1', 'MANAGER');

    expect(apiFetchMock).toHaveBeenCalledWith('/api/auth/set-context', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ tenantId: 'tenant_1', locationId: 'location_1', mode: 'MANAGER' }),
    }));
    expect(setTokensMock).toHaveBeenCalledWith({ accessToken: 'next-token' });
    expect(result).toEqual({ token: 'next-token', me: mePayload });
  });
});
