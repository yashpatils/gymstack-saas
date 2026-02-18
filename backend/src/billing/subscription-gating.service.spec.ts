import { SubscriptionStatus } from '@prisma/client';
import { SubscriptionGatingService } from './subscription-gating.service';

describe('SubscriptionGatingService', () => {
  it('allows qa bypass while preserving wouldBeBlocked status', () => {
    const service = new SubscriptionGatingService({} as never, { get: jest.fn() } as never);

    const evaluated = service.evaluateTenantAccess({ subscriptionStatus: SubscriptionStatus.FREE }, true);

    expect(evaluated.effectiveAccess).toBe(true);
    expect(evaluated.gatingStatus).toEqual({
      wouldBeBlocked: true,
      reasonCode: 'NO_ACTIVE_SUBSCRIPTION',
    });
  });

  it('blocks non-bypass users when subscription is inactive', () => {
    const service = new SubscriptionGatingService({} as never, { get: jest.fn() } as never);

    const evaluated = service.evaluateTenantAccess({ subscriptionStatus: SubscriptionStatus.CANCELED }, false);

    expect(evaluated.effectiveAccess).toBe(false);
    expect(evaluated.gatingStatus.wouldBeBlocked).toBe(true);
  });
});
