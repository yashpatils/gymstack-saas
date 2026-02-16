import { RequireVerifiedEmailGuard } from './require-verified-email.guard';

function buildContext(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as never;
}

describe('RequireVerifiedEmailGuard', () => {
  const guard = new RequireVerifiedEmailGuard();

  it('passes through when unauthenticated and lets JWT guard handle 401', () => {
    expect(guard.canActivate(buildContext({ method: 'GET', path: '/api/gyms' }))).toBe(true);
  });

  it('blocks authenticated unverified users with stable error code', () => {
    expect(() => guard.canActivate(buildContext({ user: { id: 'user_1', emailVerifiedAt: null } }))).toThrow('Email not verified');
  });

  it('allows verified users', () => {
    expect(guard.canActivate(buildContext({ user: { id: 'user_1', emailVerifiedAt: new Date().toISOString() } }))).toBe(true);
  });
});
