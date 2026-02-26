import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_API_URL = process.env.NEXT_PUBLIC_API_URL;
const ORIGINAL_SERVER_API_URL = process.env.API_URL;

describe('apiFetch', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.API_URL;
  });

  afterEach(() => {
    if (ORIGINAL_API_URL) {
      process.env.NEXT_PUBLIC_API_URL = ORIGINAL_API_URL;
    } else {
      delete process.env.NEXT_PUBLIC_API_URL;
    }

    if (ORIGINAL_SERVER_API_URL) {
      process.env.API_URL = ORIGINAL_SERVER_API_URL;
    } else {
      delete process.env.API_URL;
    }

    vi.restoreAllMocks();
  });

  it('uses same-origin proxy by default in browser context', async () => {
    const { buildApiUrl } = await import('../src/lib/apiFetch');
    expect(buildApiUrl('/api/auth/me')).toBe('/api/proxy/api/auth/me');
  });

  it('uses NEXT_PUBLIC_API_URL directly in browser context when configured', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
    const { buildApiUrl } = await import('../src/lib/apiFetch');
    expect(buildApiUrl('/api/auth/me')).toBe('https://api.example.com/api/auth/me');
  });



  it('applies active tenant header from context store', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { setStoredActiveContext } = await import('../src/lib/auth/contextStore');
    const { apiFetch } = await import('../src/lib/apiFetch');

    setStoredActiveContext({ tenantId: 'org_b', locationId: null, role: 'TENANT_OWNER' as never });
    await apiFetch('/api/orgs');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('X-Active-Tenant-Id')).toBe('org_b');
  });

  it('throws ApiFetchError with status and payload details', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ message: 'Unauthorized', code: 'AUTH_401' }), {
        status: 401,
        headers: { 'content-type': 'application/json', 'x-request-id': 'req_123' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { apiFetch, ApiFetchError } = await import('../src/lib/apiFetch');

    await expect(apiFetch('/api/auth/me')).rejects.toBeInstanceOf(ApiFetchError);

    try {
      await apiFetch('/api/auth/me');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiFetchError);
      if (error instanceof ApiFetchError) {
        expect(error.statusCode).toBe(401);
        expect(error.requestId).toBe('req_123');
        expect(error.details).toEqual({ message: 'Unauthorized', code: 'AUTH_401' });
      }
    }
  });



  it('retries once with refreshed token for non-auth endpoints', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetchMock);

    const { configureApiAuth, apiFetch } = await import('../src/lib/apiFetch');
    const refreshFn = vi.fn(async () => 'fresh-token');
    const unauthorizedHandler = vi.fn();
    configureApiAuth(refreshFn, unauthorizedHandler);

    const response = await apiFetch<{ ok: boolean }>('/api/protected');

    expect(response).toEqual({ ok: true });
    expect(refreshFn).toHaveBeenCalledTimes(1);
    expect(unauthorizedHandler).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('handles unauthorized once when refresh endpoint returns 401', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetchMock);

    const { configureApiAuth, apiFetch } = await import('../src/lib/apiFetch');
    const refreshFn = vi.fn(async () => {
      await apiFetch('/api/auth/refresh', {
        method: 'POST',
        skipAuthRetry: true,
        suppressUnauthorizedHandler: true,
      });
      return null;
    });
    const unauthorizedHandler = vi.fn();
    configureApiAuth(refreshFn, unauthorizedHandler);

    await expect(apiFetch('/api/protected')).rejects.toBeDefined();
    expect(refreshFn).toHaveBeenCalledTimes(1);
    expect(unauthorizedHandler).toHaveBeenCalledTimes(1);
  });
  it('does not attempt refresh retry for auth-sensitive endpoints', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { apiFetch, configureApiAuth } = await import('../src/lib/apiFetch');
    const refreshFn = vi.fn(async () => 'new-token');
    configureApiAuth(refreshFn);

    await expect(apiFetch('/api/auth/refresh')).rejects.toBeDefined();
    expect(refreshFn).not.toHaveBeenCalled();
  });
});
