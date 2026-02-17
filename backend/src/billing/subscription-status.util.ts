import { SubscriptionStatus } from '@prisma/client';

const ACTIVE_STATUSES = new Set<SubscriptionStatus>([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]);

export function isActiveSubscriptionStatus(status: SubscriptionStatus | null | undefined): boolean {
  return Boolean(status && ACTIVE_STATUSES.has(status));
}

export function normalizeSubscriptionStatus(status: string | null | undefined): SubscriptionStatus {
  const normalized = (status ?? '').toLowerCase();

  if (normalized === 'active') {
    return SubscriptionStatus.ACTIVE;
  }

  if (normalized === 'trial' || normalized === 'trialing') {
    return SubscriptionStatus.TRIAL;
  }

  if (normalized === 'past_due' || normalized === 'past due') {
    return SubscriptionStatus.PAST_DUE;
  }

  if (normalized === 'canceled' || normalized === 'cancelled' || normalized === 'unpaid') {
    return SubscriptionStatus.CANCELED;
  }

  return SubscriptionStatus.FREE;
}
