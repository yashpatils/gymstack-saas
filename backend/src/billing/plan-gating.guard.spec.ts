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

  it('allows qa bypass user but still reflects blocked status in gating evaluation', async () => {
    const reflector = { getAllAndOverride: () => 'pro' } as unknown as Reflector;
    const service = {
      getTenantBillingSnapshot: jest.fn().mockResolvedValue({
        subscriptionStatus: SubscriptionStatus.FREE,
        planKey: 'starter',
        trialEndsAt: null,
        stripePriceId: null,
        whiteLabelEnabled: false,
      }),
      evaluateTenantAccess: jest.fn().mockReturnValue({
        effectiveAccess: true,
        gatingStatus: {
          wouldBeBlocked: true,
          reasonCode: 'NO_ACTIVE_SUBSCRIPTION',
        },
      }),
    };
    const guard = new PlanGatingGuard(reflector, service as never);

    await expect(guard.canActivate(createContext({ role: Role.USER, activeTenantId: 'tenant_1', qaBypass: true } as never))).resolves.toBe(true);

    expect(service.evaluateTenantAccess()).toEqual({
      effectiveAccess: true,
      gatingStatus: {
        wouldBeBlocked: true,
        reasonCode: 'NO_ACTIVE_SUBSCRIPTION',
      },
    });
  });
});
