import { beforeEach, describe, expect, it, vi } from 'vitest';

const clearTokensMock = vi.fn();
const clearStoredActiveContextMock = vi.fn();
const setStoredPlatformRoleMock = vi.fn();
const setSupportModeContextMock = vi.fn();

vi.mock('./auth/tokenStore', () => ({
  clearTokens: clearTokensMock,
  getAccessToken: vi.fn(() => 'token-123'),
}));

vi.mock('./auth/contextStore', () => ({
  clearStoredActiveContext: clearStoredActiveContextMock,
  getStoredActiveContext: vi.fn(() => null),
}));

vi.mock('./supportMode', () => ({
  getStoredPlatformRole: vi.fn(() => null),
  getSupportModeContext: vi.fn(() => null),
  setStoredPlatformRole: setStoredPlatformRoleMock,
  setSupportModeContext: setSupportModeContextMock,
}));

vi.mock('./monitoring', () => ({
  addFrontendBreadcrumb: vi.fn(),
  captureFrontendApiError: vi.fn(),
}));

describe('apiFetch unauthorized handling', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    })));
  });

  it('does not dispatch duplicate session-expired events on soft auth paths when callback handles unauthorized', async () => {
    const sessionExpiredSpy = vi.fn();
    window.addEventListener('gymstack:session-expired', sessionExpiredSpy);

    const { apiFetch, configureApiAuth } = await import('./apiFetch');

    configureApiAuth(
      async () => null,
      () => {
        window.dispatchEvent(new Event('gymstack:session-expired'));
      },
    );

    await expect(apiFetch('/api/auth/me')).rejects.toMatchObject({ statusCode: 401 });

    expect(sessionExpiredSpy).toHaveBeenCalledTimes(1);
    expect(clearTokensMock).toHaveBeenCalledTimes(1);

    window.removeEventListener('gymstack:session-expired', sessionExpiredSpy);
  });

  it('retries once after refreshing the access token', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetchMock);

    const onUnauthorized = vi.fn();
    const refreshMock = vi.fn(async () => 'new-access-token');
    const { apiFetch, configureApiAuth } = await import('./apiFetch');

    configureApiAuth(refreshMock, onUnauthorized);

    await expect(apiFetch<{ ok: boolean }>('/api/tenants')).resolves.toEqual({ ok: true });

    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('calls unauthorized handler when refresh fails', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const onUnauthorized = vi.fn();
    const refreshMock = vi.fn(async () => null);
    const { apiFetch, configureApiAuth } = await import('./apiFetch');
    configureApiAuth(refreshMock, onUnauthorized);

    await expect(apiFetch('/api/tenants')).rejects.toMatchObject({ statusCode: 401 });

    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
