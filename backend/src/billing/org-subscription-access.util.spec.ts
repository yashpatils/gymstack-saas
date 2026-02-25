import { SubscriptionStatus } from '@prisma/client';
import {
  isOrganizationBillingRestricted,
  isRestrictedTenantRouteAllowed,
  shouldRestrictTenantAccess,
} from './org-subscription-access.util';

describe('org-subscription-access.util', () => {
  it('treats past_due and canceled as restricted statuses', () => {
    expect(isOrganizationBillingRestricted(SubscriptionStatus.PAST_DUE)).toBe(true);
    expect(isOrganizationBillingRestricted(SubscriptionStatus.CANCELED)).toBe(true);
    expect(isOrganizationBillingRestricted(SubscriptionStatus.ACTIVE)).toBe(false);
  });

  it('allows billing and support routes while restricted', () => {
    expect(isRestrictedTenantRouteAllowed('/api/billing/org/status')).toBe(true);
    expect(isRestrictedTenantRouteAllowed('/api/support/ticket')).toBe(true);
    expect(isRestrictedTenantRouteAllowed('/api/auth/me')).toBe(true);
    expect(isRestrictedTenantRouteAllowed('/api/analytics/overview')).toBe(false);
  });

  it('restricts non-billing/support routes for past_due orgs', () => {
    expect(shouldRestrictTenantAccess({
      subscriptionStatus: SubscriptionStatus.PAST_DUE,
      pathname: '/api/analytics/overview',
    })).toBe(true);

    expect(shouldRestrictTenantAccess({
      subscriptionStatus: SubscriptionStatus.PAST_DUE,
      pathname: '/api/billing/org/status',
    })).toBe(false);
  });
});

