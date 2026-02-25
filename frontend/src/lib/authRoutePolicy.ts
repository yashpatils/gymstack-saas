export type AuthRouteDecision =
  | { action: 'allow'; reason: string }
  | { action: 'redirect'; to: string; reason: string }
  | { action: 'defer'; reason: string };

export type AuthSnapshot = {
  isAuthenticated: boolean;
  isHydrating?: boolean;
  isPlatformAdmin?: boolean;
  membershipsCount?: number;
  hasSelectedWorkspace?: boolean;
  onboardingIncomplete?: boolean;
};

export type RouteContext = {
  pathname: string;
  isAdminHost?: boolean;
  isLoginRoute?: boolean;
  isAdminRoute?: boolean;
  isPlatformRoute?: boolean;
  isOnboardingRoute?: boolean;
  isWorkspaceSelectRoute?: boolean;
};

function hasAuth(snapshot: AuthSnapshot): boolean {
  return snapshot.isAuthenticated;
}

export function normalizeRouteContext(pathname: string, isAdminHost = false): RouteContext {
  const isLoginRoute = pathname === '/login';
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/') || pathname === '/_admin' || pathname.startsWith('/_admin/');
  const isPlatformRoute = pathname === '/platform' || pathname.startsWith('/platform/');
  const isOnboardingRoute = pathname === '/onboarding' || pathname.startsWith('/onboarding/');
  const isWorkspaceSelectRoute = pathname === '/select-workspace' || pathname.startsWith('/select-workspace/');

  return {
    pathname,
    isAdminHost,
    isLoginRoute,
    isAdminRoute,
    isPlatformRoute,
    isOnboardingRoute,
    isWorkspaceSelectRoute,
  };
}

export function getDefaultAuthedLanding(snapshot: AuthSnapshot): string {
  if (snapshot.isPlatformAdmin) {
    return '/admin';
  }

  if (snapshot.membershipsCount === 0) {
    return '/onboarding';
  }

  if (snapshot.onboardingIncomplete) {
    return '/onboarding';
  }

  if (!snapshot.hasSelectedWorkspace && (snapshot.membershipsCount ?? 0) > 1) {
    return '/select-workspace';
  }

  return '/platform';
}

export function decideAuthRoute(auth: AuthSnapshot, route: RouteContext): AuthRouteDecision {
  if (auth.isHydrating) {
    return { action: 'defer', reason: 'auth-hydrating' };
  }

  if (!hasAuth(auth)) {
    if (route.isPlatformRoute || route.isWorkspaceSelectRoute || route.isOnboardingRoute) {
      return { action: 'redirect', to: '/login', reason: 'unauthenticated-protected-platform-route' };
    }

    if (route.isAdminRoute) {
      return { action: 'redirect', to: '/login?next=/admin', reason: 'unauthenticated-admin-route' };
    }

    return { action: 'allow', reason: 'guest-public-route' };
  }

  const defaultAuthedLanding = getDefaultAuthedLanding(auth);

  if (route.isLoginRoute) {
    return { action: 'redirect', to: defaultAuthedLanding, reason: 'authenticated-login-route' };
  }

  if (route.isAdminRoute && !auth.isPlatformAdmin) {
    return { action: 'redirect', to: '/admin/access-restricted', reason: 'non-admin-admin-route' };
  }

  if (route.isPlatformRoute || route.isWorkspaceSelectRoute || route.isOnboardingRoute) {
    if (defaultAuthedLanding !== '/platform' && route.pathname !== defaultAuthedLanding) {
      return { action: 'redirect', to: defaultAuthedLanding, reason: 'workspace-or-onboarding-required' };
    }
  }

  return { action: 'allow', reason: 'authenticated-allowed' };
}
