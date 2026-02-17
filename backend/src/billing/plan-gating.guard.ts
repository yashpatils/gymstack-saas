import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, SubscriptionStatus } from '@prisma/client';
import { SubscriptionGatingService } from './subscription-gating.service';
import { REQUIRED_PLAN_KEY } from './require-plan.decorator';

const PLAN_ORDER: Record<string, number> = { free: -1, starter: 0, pro: 1, enterprise: 2 };

@Injectable()
export class PlanGatingGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionGatingService: SubscriptionGatingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPlan = this.reflector.getAllAndOverride<'starter' | 'pro' | 'enterprise'>(REQUIRED_PLAN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPlan) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: { role?: Role; activeTenantId?: string; orgId?: string } }>();
    const role = request.user?.role;
    if (role === Role.ADMIN || role === Role.PLATFORM_ADMIN) {
      return true;
    }

    const tenantId = request.user?.activeTenantId ?? request.user?.orgId;
    if (!tenantId) {
      throw new HttpException({
        code: 'PLAN_UPGRADE_REQUIRED',
        message: 'Upgrade to continue using this feature.',
        currentPlan: 'free',
        requiredPlan,
        subscriptionStatus: 'FREE',
        trialEnded: false,
        upgradeUrl: '/platform/billing',
      }, 402);
    }

    const snapshot = await this.subscriptionGatingService.getTenantBillingSnapshot(tenantId);
    const currentPlan = snapshot?.subscriptionStatus === SubscriptionStatus.FREE ? 'free' : (snapshot?.planKey ?? 'starter');
    const status = snapshot?.subscriptionStatus ?? SubscriptionStatus.FREE;

    const allowed = (status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.TRIAL)
      && (PLAN_ORDER[currentPlan] ?? 0) >= PLAN_ORDER[requiredPlan];

    if (!allowed) {
      throw new HttpException({
        code: 'PLAN_UPGRADE_REQUIRED',
        message: 'Upgrade to continue using this feature.',
        currentPlan,
        requiredPlan,
        subscriptionStatus: status,
        trialEndsAt: snapshot?.trialEndsAt?.toISOString() ?? null,
        trialEnded: status === SubscriptionStatus.FREE && Boolean(snapshot?.trialEndsAt && snapshot.trialEndsAt.getTime() < Date.now()),
        upgradeUrl: '/platform/billing',
      }, 402);
    }

    return true;
  }
}
