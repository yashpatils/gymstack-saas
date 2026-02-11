export const ACTIVE_SUBSCRIPTION_STATUS = 'ACTIVE';

export function isActiveSubscription(status?: string | null): boolean {
  return status === ACTIVE_SUBSCRIPTION_STATUS;
}

export function formatSubscriptionStatus(status?: string | null): string {
  if (!status) {
    return 'Unknown';
  }

  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
