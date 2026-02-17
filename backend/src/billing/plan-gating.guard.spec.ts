import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, SubscriptionStatus } from '@prisma/client';
import { PlanGatingGuard } from './plan-gating.guard';

describe('PlanGatingGuard', () => {
  function createContext(user: { role?: Role; activeTenantId?: string; orgId?: string }): ExecutionContext {
    return {
      getHandler: () => ({}) as never,
      getClass: () => ({}) as never,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }

  it('allows platform admins', async () => {
    const reflector = { getAllAndOverride: () => 'pro' } as unknown as Reflector;
    const service = { getTenantBillingSnapshot: jest.fn() };
    const guard = new PlanGatingGuard(reflector, service as never);

    await expect(guard.canActivate(createContext({ role: Role.PLATFORM_ADMIN }))).resolves.toBe(true);
  });

  it('throws payment required for free tenant on paid feature', async () => {
    const reflector = { getAllAndOverride: () => 'pro' } as unknown as Reflector;
    const service = {
      getTenantBillingSnapshot: jest.fn().mockResolvedValue({
        subscriptionStatus: SubscriptionStatus.FREE,
        planKey: 'starter',
        trialEndsAt: null,
        stripePriceId: null,
        whiteLabelEnabled: false,
      }),
    };
    const guard = new PlanGatingGuard(reflector, service as never);

    await expect(guard.canActivate(createContext({ role: Role.USER, activeTenantId: 'tenant_1' }))).rejects.toBeInstanceOf(HttpException);
  });
});
