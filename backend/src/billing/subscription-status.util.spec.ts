import { SubscriptionStatus } from '@prisma/client';
import { normalizeSubscriptionStatus } from './subscription-status.util';

describe('normalizeSubscriptionStatus', () => {
  it('maps stripe and razorpay style statuses', () => {
    expect(normalizeSubscriptionStatus('active')).toBe(SubscriptionStatus.ACTIVE);
    expect(normalizeSubscriptionStatus('trialing')).toBe(SubscriptionStatus.TRIAL);
    expect(normalizeSubscriptionStatus('past_due')).toBe(SubscriptionStatus.PAST_DUE);
    expect(normalizeSubscriptionStatus('cancelled')).toBe(SubscriptionStatus.CANCELED);
    expect(normalizeSubscriptionStatus('unknown')).toBe(SubscriptionStatus.FREE);
  });
});
