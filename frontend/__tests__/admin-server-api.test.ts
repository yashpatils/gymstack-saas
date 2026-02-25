import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirectMock = vi.fn((to: string) => {
  throw new Error(`REDIRECT:${to}`);
});

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: () => ({ value: 'token-1' }),
  }),
  headers: () => ({
    get: (key: string) => (key.toLowerCase() === 'host' ? 'admin.gymstack.club' : null),
  }),
}));

vi.mock('../src/lib/domainConfig', () => ({
  getAdminHost: () => 'admin.gymstack.club',
}));

describe('admin server api', () => {
  beforeEach(() => {
    vi.resetModules();
    redirectMock.mockClear();
  });

  it('redirects non-admin 403 to access-restricted with requestId', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ message: 'Access restricted' }), { status: 403, headers: { 'x-request-id': 'req_403_1' } })),
    );

    const { adminApiFetch } = await import('../app/admin/_lib/server-admin-api');

    await expect(adminApiFetch('/api/admin/orgs')).rejects.toThrow('REDIRECT:/admin/access-restricted?requestId=req_403_1');
    expect(redirectMock).toHaveBeenCalledWith('/admin/access-restricted?requestId=req_403_1');
  });
});
