import { login } from '../src/lib/auth';
import { apiFetch } from '../src/lib/apiFetch';
import { setTokens } from '../src/lib/auth/tokenStore';

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
      token: 'access-token',
      user: { id: 'u1', email: 'test@example.com' },
      memberships: [{ id: 'm1' }],
    });
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
