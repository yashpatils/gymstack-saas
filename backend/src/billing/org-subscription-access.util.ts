import { SubscriptionStatus } from '@prisma/client';

const ALLOWED_WHEN_RESTRICTED_PATH_PREFIXES = [
  '/api/billing',
  '/billing',
  '/api/support',
  '/support',
  '/api/auth',
  '/auth',
];

export function isOrganizationBillingRestricted(status: SubscriptionStatus | null | undefined): boolean {
  return status === SubscriptionStatus.PAST_DUE || status === SubscriptionStatus.CANCELED;
}

export function isRestrictedTenantRouteAllowed(pathname: string): boolean {
  return ALLOWED_WHEN_RESTRICTED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function shouldRestrictTenantAccess(input: {
  subscriptionStatus: SubscriptionStatus | null | undefined;
  pathname: string;
}): boolean {
  if (!isOrganizationBillingRestricted(input.subscriptionStatus)) {
    return false;
  }

  return !isRestrictedTenantRouteAllowed(input.pathname);
}

