import { MembershipRole, MembershipStatus, Role, UserStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService 2FA login', () => {
  const createService = () => {
    const prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      membership: { findMany: jest.fn() },
      organization: { findMany: jest.fn(), findFirst: jest.fn() },
      loginOtpChallenge: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops)),
      gym: { findMany: jest.fn() },
    };
    const jwtService = { sign: jest.fn().mockReturnValue('access-token') } as unknown as JwtService;
    const configService = { get: jest.fn() } as unknown as ConfigService;
    const auditService = { log: jest.fn() };
    const notificationsService = { createForUser: jest.fn() };
    const emailService = { sendTemplatedActionEmail: jest.fn(), sendVerifyEmail: jest.fn() };
    const refreshTokenService = { issue: jest.fn().mockResolvedValue('refresh-token') };
    const inviteAdmissionService = { admitWithInvite: jest.fn() };
    const subscriptionGatingService = { buildSummary: jest.fn() };

    const service = new AuthService(
      prisma as never,
      jwtService,
      configService,
      auditService as never,
      notificationsService as never,
      emailService as never,
      refreshTokenService as never,
      inviteAdmissionService as never,
      subscriptionGatingService as never,
    );

    return { service, prisma, refreshTokenService };
  };

  it('does not authenticate password-only login when 2FA is enabled', async () => {
    const { service, prisma, refreshTokenService } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'otp@example.com',
      password: await bcrypt.hash('Password123!', 1),
      role: Role.USER,
      status: UserStatus.ACTIVE,
      orgId: 'org-1',
      deletionRequestedAt: null,
      qaBypass: false,
      emailVerifiedAt: null,
      twoFactorEnabled: true,
      twoStepEmailEnabled: true,
    });
    prisma.membership.findMany.mockResolvedValue([{ orgId: 'org-1', gymId: null, role: MembershipRole.TENANT_OWNER, status: MembershipStatus.ACTIVE, createdAt: new Date() }]);
    prisma.organization.findMany.mockResolvedValue([{ id: 'org-1', name: 'Tenant', isDisabled: false, createdAt: new Date() }]);
    prisma.loginOtpChallenge.create.mockResolvedValue({ id: 'challenge-1' });

    const result = await service.login({ email: 'otp@example.com', password: 'Password123!' });

    expect(result.status).toBe('OTP_REQUIRED');
    expect(refreshTokenService.issue).not.toHaveBeenCalled();
  });

  it('authenticates after OTP verification', async () => {
    const { service, prisma, refreshTokenService } = createService();
    prisma.loginOtpChallenge.findFirst.mockResolvedValue({
      id: 'challenge-1',
      userId: 'user-1',
      otpHash: require('crypto').createHash('sha256').update('123456').digest('hex'),
      otpExpiresAt: new Date(Date.now() + 60_000),
      attempts: 0,
      maxAttempts: 5,
      adminOnly: false,
      tenantId: null,
      tenantSlug: null,
      consumedAt: null,
      user: {
        id: 'user-1', email: 'otp@example.com', role: Role.USER, orgId: 'org-1', qaBypass: false, emailVerifiedAt: null,
      },
    });
    prisma.membership.findMany.mockResolvedValue([{ orgId: 'org-1', gymId: null, role: MembershipRole.TENANT_OWNER, status: MembershipStatus.ACTIVE, createdAt: new Date() }]);

    const result = await service.verifyLoginOtp({ challengeId: 'challenge-1', otp: '123456' });

    expect(result.status).toBe('SUCCESS');
    expect(result.accessToken).toBe('access-token');
    expect(refreshTokenService.issue).toHaveBeenCalled();
  });

  it('rejects admin-only OTP completion for non-platform-admin users', async () => {
    const { service, prisma } = createService();
    prisma.loginOtpChallenge.findFirst.mockResolvedValue({
      id: 'challenge-1',
      userId: 'user-1',
      otpHash: require('crypto').createHash('sha256').update('123456').digest('hex'),
      otpExpiresAt: new Date(Date.now() + 60_000),
      attempts: 0,
      maxAttempts: 5,
      adminOnly: true,
      tenantId: null,
      tenantSlug: null,
      consumedAt: null,
      user: {
        id: 'user-1', email: 'member@example.com', role: Role.USER, orgId: 'org-1', qaBypass: false, emailVerifiedAt: null,
      },
    });

    await expect(service.verifyLoginOtp({ challengeId: 'challenge-1', otp: '123456' })).rejects.toMatchObject({
      response: { code: 'AUTH_ADMIN_REQUIRED' },
    });
  });
});
