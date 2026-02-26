import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DistributedRateLimitService } from './distributed-rate-limit.service';

@Injectable()
export class TenantRateLimitGuard implements CanActivate {
  private readonly tenantLimitCache = new Map<string, { limit: number; expiresAt: number }>();
  private readonly overridesCacheTtlMs = 30_000;
  private readonly tenantLimitCacheTtlMs = 60_000;
  private overridesCache: { value: Map<string, number>; expiresAt: number } = {
    value: new Map(),
    expiresAt: 0,
  };

  constructor(
    private readonly limiter: DistributedRateLimitService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<{
      user?: { activeTenantId?: string; orgId?: string; id?: string };
      ip?: string;
      path?: string;
      headers?: Record<string, string | string[] | undefined>;
    }>();
    const res = http.getResponse<{ setHeader?: (name: string, value: string) => void }>();
    const tenantId = req.user?.activeTenantId ?? req.user?.orgId ?? null;
    const clientIp = this.extractClientIp(req);
    const key = `${tenantId ?? 'public'}:${clientIp}:${req.path ?? 'path'}`;
    const limit = await this.resolveLimit(tenantId);
    const decision = await this.limiter.check(key, limit, 60_000);
    this.applyRateLimitHeaders(res, decision.limit, decision.remaining, decision.resetAt, decision.retryAfterSeconds);

    if (!decision.allowed) {
      throw new HttpException({
        message: 'Too many requests. Please try again later.',
        retryAfterSeconds: decision.retryAfterSeconds,
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }

  private extractClientIp(request: {
    ip?: string;
    headers?: Record<string, string | string[] | undefined>;
  }): string {
    const forwardedFor = request.headers?.['x-forwarded-for'];
    const forwardedValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const forwardedIp = forwardedValue?.split(',')[0]?.trim();

    return forwardedIp || request.ip || 'unknown';
  }

  private applyRateLimitHeaders(
    response: { setHeader?: (name: string, value: string) => void } | undefined,
    limit: number,
    remaining: number,
    resetAt: number,
    retryAfterSeconds: number,
  ): void {
    if (!response?.setHeader) {
      return;
    }

    response.setHeader('X-RateLimit-Limit', String(limit));
    response.setHeader('X-RateLimit-Remaining', String(remaining));
    response.setHeader('X-RateLimit-Reset', String(Math.floor(resetAt / 1000)));
    response.setHeader('Retry-After', String(retryAfterSeconds));
  }

  private async resolveLimit(tenantId: string | null): Promise<number> {
    const overrides = this.getOverrides();
    if (tenantId && overrides.has(tenantId)) {
      return overrides.get(tenantId) ?? 240;
    }

    if (!tenantId) {
      return Number.parseInt(process.env.RATE_LIMIT_PUBLIC_PER_MINUTE ?? '60', 10);
    }

    const now = Date.now();
    const cached = this.tenantLimitCache.get(tenantId);
    if (cached && cached.expiresAt > now) {
      return cached.limit;
    }

    const tenant = await this.prisma.organization.findUnique({ where: { id: tenantId }, select: { subscriptionStatus: true } });
    const limit = tenant?.subscriptionStatus === SubscriptionStatus.ACTIVE
      ? Number.parseInt(process.env.RATE_LIMIT_PRO_PER_MINUTE ?? '240', 10)
      : Number.parseInt(process.env.RATE_LIMIT_STARTER_PER_MINUTE ?? '120', 10);

    this.tenantLimitCache.set(tenantId, {
      limit,
      expiresAt: now + this.tenantLimitCacheTtlMs,
    });

    return limit;
  }

  private getOverrides(): Map<string, number> {
    const now = Date.now();
    if (this.overridesCache.expiresAt > now) {
      return this.overridesCache.value;
    }

    const value = this.parseOverrides(process.env.RATE_LIMIT_OVERRIDES ?? '');
    this.overridesCache = {
      value,
      expiresAt: now + this.overridesCacheTtlMs,
    };
    return value;
  }

  private parseOverrides(raw: string): Map<string, number> {
    const map = new Map<string, number>();
    for (const pair of raw.split(',')) {
      const [tenantId, limitValue] = pair.split(':');
      if (!tenantId || !limitValue) continue;
      const parsed = Number.parseInt(limitValue, 10);
      if (Number.isFinite(parsed)) map.set(tenantId, parsed);
    }
    return map;
  }
}
