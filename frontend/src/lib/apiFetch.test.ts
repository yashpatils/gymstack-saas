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
});
