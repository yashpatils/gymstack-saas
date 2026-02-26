import { clearTokens, setTokens } from '../src/lib/auth/tokenStore';
import { login, refreshAccessToken, setContext } from '../src/lib/auth';
import { apiFetch } from '../src/lib/apiFetch';

vi.mock('../src/lib/apiFetch', () => ({
  apiFetch: vi.fn(),
  configureApiAuth: vi.fn(),
  buildApiUrl: vi.fn((path: string) => path),
  ApiFetchError: class ApiFetchError extends Error {
    statusCode?: number;
  },
}));

vi.mock('../src/lib/auth/tokenStore', () => ({
  setTokens: vi.fn(),
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  clearTokens: vi.fn(),
}));

describe('auth.login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores tokens and returns mapped payload for successful login', async () => {
    (apiFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'u1', email: 'test@example.com' },
      memberships: [{ id: 'm1' }],
      activeContext: { tenantId: 't1', role: 'TENANT_OWNER' },
    });

    const result = await login('test@example.com', 'pw123456');

    expect(setTokens).toHaveBeenCalledWith({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(result).toMatchObject({
      status: 'SUCCESS',
      token: 'access-token',
      user: { id: 'u1', email: 'test@example.com' },
      memberships: [{ id: 'm1' }],
    });
  });

  it('does not store tokens for OTP_REQUIRED login', async () => {
    (apiFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: 'OTP_REQUIRED',
      challengeId: 'challenge-1',
      channel: 'email',
      expiresAt: '2026-01-01T00:00:00.000Z',
      maskedEmail: 't***@example.com',
    });

    const result = await login('test@example.com', 'pw123456');

    expect(setTokens).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'OTP_REQUIRED',
      challengeId: 'challenge-1',
      channel: 'email',
      expiresAt: '2026-01-01T00:00:00.000Z',
      maskedEmail: 't***@example.com',
    });
  });



  it('uses set-context response me payload immediately and stores returned access token', async () => {
    (apiFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      accessToken: 'context-token',
      me: { user: { id: 'u1', email: 'test@example.com' }, memberships: [], permissions: {}, permissionKeys: [] },
    });

    const result = await setContext('tenant_1', 'location_1', 'OWNER');

    expect(setTokens).toHaveBeenCalledWith({ accessToken: 'context-token' });
    expect(result.token).toBe('context-token');
    expect(result.me.user.id).toBe('u1');
  });

  it('returns null on invalid refresh token and does not clear tokens itself', async () => {
    const ApiFetchError = (await import('../src/lib/apiFetch')).ApiFetchError;
    (apiFetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new ApiFetchError('Unauthorized', 401));

    const refreshed = await refreshAccessToken();

    expect(refreshed).toBeNull();
    expect(clearTokens).not.toHaveBeenCalled();
  });

  it('uses admin login endpoint when adminOnly=true', async () => {
    (apiFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'u1', email: 'admin@example.com' },
      memberships: [],
    });

    await login('admin@example.com', 'pw123456', { adminOnly: true });

    expect(apiFetch).toHaveBeenCalledWith('/api/auth/admin/login', expect.any(Object));
  });
});
