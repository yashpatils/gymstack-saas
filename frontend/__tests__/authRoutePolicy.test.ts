import { describe, expect, it } from 'vitest';
import { decideAuthRoute, getDefaultAuthedLanding, normalizeRouteContext } from '../src/lib/authRoutePolicy';

describe('authRoutePolicy', () => {
  it('redirects unauthenticated platform routes to login', () => {
    const decision = decideAuthRoute({ isAuthenticated: false }, normalizeRouteContext('/platform'));
    expect(decision).toEqual({ action: 'redirect', to: '/login', reason: 'unauthenticated-protected-platform-route' });
  });

  it('redirects unauthenticated admin routes to admin login intent', () => {
    const decision = decideAuthRoute({ isAuthenticated: false }, normalizeRouteContext('/admin/users', true));
    expect(decision).toEqual({ action: 'redirect', to: '/login?next=/admin', reason: 'unauthenticated-admin-route' });
  });

  it('defers while hydrating', () => {
    const decision = decideAuthRoute({ isAuthenticated: true, isHydrating: true }, normalizeRouteContext('/platform'));
    expect(decision).toEqual({ action: 'defer', reason: 'auth-hydrating' });
  });

  it('sends authenticated users off login route to deterministic destination', () => {
    expect(getDefaultAuthedLanding({ isAuthenticated: true, membershipsCount: 0 })).toBe('/onboarding');
    expect(getDefaultAuthedLanding({ isAuthenticated: true, membershipsCount: 2, hasSelectedWorkspace: false })).toBe('/select-workspace');
    expect(getDefaultAuthedLanding({ isAuthenticated: true, membershipsCount: 1, hasSelectedWorkspace: true })).toBe('/platform');
    expect(getDefaultAuthedLanding({ isAuthenticated: true, isPlatformAdmin: true, membershipsCount: 0 })).toBe('/admin');
  });
});
