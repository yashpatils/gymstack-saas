import { HttpStatus } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { TenantRateLimitGuard } from './tenant-rate-limit.guard';
import type { RateLimitDecision } from './distributed-rate-limit.service';

describe('TenantRateLimitGuard', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('caches tenant tier lookup to avoid DB lookup per request', async () => {
    process.env = {
      ...originalEnv,
      RATE_LIMIT_PRO_PER_MINUTE: '240',
      RATE_LIMIT_STARTER_PER_MINUTE: '120',
    };

    const check = jest.fn<Promise<RateLimitDecision>, [string, number, number]>().mockResolvedValue({
      allowed: true,
      limit: 240,
      remaining: 239,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 60,
    });

    const findUnique = jest.fn().mockResolvedValue({ subscriptionStatus: SubscriptionStatus.ACTIVE });
    const guard = new TenantRateLimitGuard(
      { check } as never,
      { organization: { findUnique } } as never,
    );

    const headers = new Map<string, string>();
    const context = createContext({
      user: { activeTenantId: 'tenant-a' },
      ip: '1.2.3.4',
      path: '/v1/resource',
    }, headers);

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    await expect(guard.canActivate(context as never)).resolves.toBe(true);

    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(check).toHaveBeenCalledTimes(2);
  });

  it('applies per-tenant limits and keeps tenants separated', async () => {
    process.env = {
      ...originalEnv,
      RATE_LIMIT_PRO_PER_MINUTE: '240',
      RATE_LIMIT_STARTER_PER_MINUTE: '120',
    };

    const check = jest.fn<Promise<RateLimitDecision>, [string, number, number]>().mockImplementation(async (key, limit) => ({
      allowed: true,
      limit,
      remaining: 1,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 60,
    }));

    const findUnique = jest.fn()
      .mockResolvedValueOnce({ subscriptionStatus: SubscriptionStatus.ACTIVE })
      .mockResolvedValueOnce({ subscriptionStatus: SubscriptionStatus.TRIALING });

    const guard = new TenantRateLimitGuard(
      { check } as never,
      { organization: { findUnique } } as never,
    );

    await guard.canActivate(createContext({ user: { activeTenantId: 'tenant-pro' }, ip: '1.1.1.1', path: '/x' }) as never);
    await guard.canActivate(createContext({ user: { activeTenantId: 'tenant-starter' }, ip: '1.1.1.1', path: '/x' }) as never);

    expect(check).toHaveBeenNthCalledWith(1, 'tenant-pro:1.1.1.1:/x', 240, 60_000);
    expect(check).toHaveBeenNthCalledWith(2, 'tenant-starter:1.1.1.1:/x', 120, 60_000);
  });

  it('returns proper headers and exception when rate limit is exceeded', async () => {
    process.env = {
      ...originalEnv,
      RATE_LIMIT_PUBLIC_PER_MINUTE: '60',
    };

    const check = jest.fn<Promise<RateLimitDecision>, [string, number, number]>().mockResolvedValue({
      allowed: false,
      limit: 60,
      remaining: 0,
      resetAt: 1_700_000_000_000,
      retryAfterSeconds: 42,
    });

    const guard = new TenantRateLimitGuard(
      { check } as never,
      { organization: { findUnique: jest.fn() } } as never,
    );

    const headers = new Map<string, string>();
    await expect(guard.canActivate(createContext({ ip: '9.9.9.9', path: '/public' }, headers) as never)).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });

    expect(headers.get('X-RateLimit-Limit')).toBe('60');
    expect(headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(headers.get('X-RateLimit-Reset')).toBe(String(Math.floor(1_700_000_000_000 / 1000)));
    expect(headers.get('Retry-After')).toBe('42');
  });

  it('refreshes tenant tier after cache ttl', async () => {
    process.env = {
      ...originalEnv,
      RATE_LIMIT_PRO_PER_MINUTE: '240',
      RATE_LIMIT_STARTER_PER_MINUTE: '120',
    };

    jest.spyOn(Date, 'now')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(61_000)
      .mockReturnValue(61_000);

    const check = jest.fn<Promise<RateLimitDecision>, [string, number, number]>().mockResolvedValue({
      allowed: true,
      limit: 240,
      remaining: 200,
      resetAt: 61_000,
      retryAfterSeconds: 60,
    });

    const findUnique = jest.fn()
      .mockResolvedValueOnce({ subscriptionStatus: SubscriptionStatus.ACTIVE })
      .mockResolvedValueOnce({ subscriptionStatus: SubscriptionStatus.TRIALING });

    const guard = new TenantRateLimitGuard(
      { check } as never,
      { organization: { findUnique } } as never,
    );

    const context = createContext({ user: { activeTenantId: 'tenant-a' }, ip: '2.2.2.2', path: '/v1' });
    await guard.canActivate(context as never);
    await guard.canActivate(context as never);

    expect(findUnique).toHaveBeenCalledTimes(2);
    expect(check).toHaveBeenNthCalledWith(1, 'tenant-a:2.2.2.2:/v1', 240, 60_000);
    expect(check).toHaveBeenNthCalledWith(2, 'tenant-a:2.2.2.2:/v1', 120, 60_000);
  });
});

function createContext(
  request: { user?: { activeTenantId?: string; orgId?: string }; ip?: string; path?: string },
  headers = new Map<string, string>(),
): { switchToHttp: () => { getRequest: () => object; getResponse: () => { setHeader: (name: string, value: string) => void } } } {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({
        setHeader: (name: string, value: string): void => {
          headers.set(name, value);
        },
      }),
    }),
  };
}
