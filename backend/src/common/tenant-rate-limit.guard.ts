import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SensitiveRateLimitService } from './sensitive-rate-limit.service';

@Injectable()
export class TenantRateLimitGuard implements CanActivate {
  constructor(
    private readonly limiter: SensitiveRateLimitService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ user?: { activeTenantId?: string; orgId?: string; id?: string }; ip?: string; path?: string }>();
    const tenantId = req.user?.activeTenantId ?? req.user?.orgId ?? null;
    const key = `${tenantId ?? 'public'}:${req.ip ?? 'unknown'}:${req.path ?? 'path'}`;
    const limit = await this.resolveLimit(tenantId);
    this.limiter.check(key, limit, 60_000);
    return true;
  }

  private async resolveLimit(tenantId: string | null): Promise<number> {
    const overrides = this.parseOverrides(process.env.RATE_LIMIT_OVERRIDES ?? '');
    if (tenantId && overrides.has(tenantId)) {
      return overrides.get(tenantId) ?? 240;
    }

    if (!tenantId) {
      return Number.parseInt(process.env.RATE_LIMIT_PUBLIC_PER_MINUTE ?? '60', 10);
    }

    const tenant = await this.prisma.organization.findUnique({ where: { id: tenantId }, select: { subscriptionStatus: true } });
    if (tenant?.subscriptionStatus === SubscriptionStatus.ACTIVE) {
      return Number.parseInt(process.env.RATE_LIMIT_PRO_PER_MINUTE ?? '240', 10);
    }

    return Number.parseInt(process.env.RATE_LIMIT_STARTER_PER_MINUTE ?? '120', 10);
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
