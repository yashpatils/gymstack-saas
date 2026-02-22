import type { ActiveContext, Membership } from '../types/auth';

export type RouteRequirement = {
  requiresAuth?: boolean;
  requiresTenant?: boolean;
  requiresLocation?: boolean;
};

export function resolveGuardRedirect(input: {
  isAuthenticated: boolean;
  activeContext?: ActiveContext;
  memberships: Membership[];
  requirement: RouteRequirement;
}): string | null {
  const { isAuthenticated, activeContext, memberships, requirement } = input;

  if (requirement.requiresAuth && !isAuthenticated) {
    return '/login';
  }

  if (requirement.requiresTenant && !activeContext?.tenantId && memberships.length > 0) {
    return '/select-org';
  }

  if (requirement.requiresLocation && !activeContext?.locationId && !activeContext?.gymId) {
    return '/select-location';
  }

  return null;
}
