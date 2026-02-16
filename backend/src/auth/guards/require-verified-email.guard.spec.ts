import { UnauthorizedException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { RequireVerifiedEmailGuard } from './require-verified-email.guard';

type MockPrisma = {
  user: {
    findUnique: jest.Mock;
  };
};

function buildContext(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as never;
}

describe('RequireVerifiedEmailGuard', () => {
  let prisma: MockPrisma;
  let guard: RequireVerifiedEmailGuard;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };
    guard = new RequireVerifiedEmailGuard(prisma as never);
  });

  it('passes through when unauthenticated and lets JWT guard handle 401', async () => {
    await expect(guard.canActivate(buildContext({ method: 'GET', path: '/api/gyms' }))).resolves.toBe(true);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('allows authenticated unverified users on allowlisted verify endpoint', async () => {
    await expect(
      guard.canActivate(buildContext({ method: 'POST', path: '/api/auth/verify-email', user: { id: 'user_1' } })),
    ).resolves.toBe(true);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('blocks authenticated unverified users on protected endpoints with stable code', async () => {
    prisma.user.findUnique.mockResolvedValue({ emailVerifiedAt: null, status: UserStatus.ACTIVE });

    await expect(
      guard.canActivate(buildContext({ method: 'GET', path: '/api/gyms', user: { id: 'user_1' } })),
    ).rejects.toMatchObject({
      response: {
        message: 'Email not verified',
        code: 'EMAIL_NOT_VERIFIED',
      },
    });
  });

  it('throws unauthorized when token user no longer exists', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(buildContext({ method: 'GET', path: '/api/gyms', user: { id: 'missing' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('allows verified users on protected endpoints', async () => {
    prisma.user.findUnique.mockResolvedValue({ emailVerifiedAt: new Date().toISOString(), status: UserStatus.ACTIVE });

    await expect(
      guard.canActivate(buildContext({ method: 'GET', path: '/api/gyms', user: { id: 'user_1' } })),
    ).resolves.toBe(true);
  });

  it('handles prefixed oauth routes in allowlist', async () => {
    await expect(
      guard.canActivate(buildContext({ method: 'GET', path: '/api/auth/oauth/google/callback', user: { id: 'user_1' } })),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(buildContext({ method: 'POST', path: '/api/auth/oauth/apple/callback', user: { id: 'user_1' } })),
    ).resolves.toBe(true);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
