import { MembershipRole, MembershipStatus, Role, UserStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

const createMocks = () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    membership: {
      findMany: jest.fn(),
    },
    gym: {
      findMany: jest.fn(),
    },
  };

  const jwtService = { sign: jest.fn().mockReturnValue('access-token') } as unknown as JwtService;
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'RESEND_API_KEY') return 'test-key';
      return undefined;
    }),
  } as unknown as ConfigService;

  const auditService = { log: jest.fn() };
  const notificationsService = { createForUser: jest.fn() };
  const emailService = { sendVerifyEmail: jest.fn() };
  const refreshTokenService = { issue: jest.fn().mockResolvedValue('refresh-token') };
  const inviteAdmissionService = { admitWithInvite: jest.fn() };

  const service = new AuthService(
    prisma as never,
    jwtService,
    configService,
    auditService as never,
    notificationsService as never,
    emailService as never,
    refreshTokenService as never,
    inviteAdmissionService as never,
  );

  return { service, prisma, emailService, inviteAdmissionService };
};

describe('AuthService verification emails', () => {
  it('sends verification email when registering with invite and user is unverified', async () => {
    const { service, prisma, emailService, inviteAdmissionService } = createMocks();

    const createdUser = {
      id: 'user-1',
      email: 'invitee@example.com',
      role: Role.USER,
      emailVerifiedAt: null,
      status: UserStatus.ACTIVE,
    };

    prisma.user.findUnique.mockImplementation(({ where }: { where: { email?: string; id?: string } }) => {
      if (where.email) {
        return Promise.resolve(null);
      }
      if (where.id === createdUser.id) {
        return Promise.resolve({ id: createdUser.id, email: createdUser.email, emailVerifiedAt: null });
      }
      return Promise.resolve(null);
    });

    prisma.user.create.mockResolvedValue(createdUser);
    prisma.user.update.mockResolvedValue(createdUser);
    prisma.membership.findMany.mockResolvedValue([
      {
        id: 'member-1',
        orgId: 'org-1',
        gymId: null,
        role: MembershipRole.CLIENT,
        status: MembershipStatus.ACTIVE,
        createdAt: new Date(),
      },
    ]);
    prisma.gym.findMany.mockResolvedValue([]);

    await service.registerWithInvite({
      email: createdUser.email,
      password: 'Password123!',
      token: 'invite-token',
    });

    expect(inviteAdmissionService.admitWithInvite).toHaveBeenCalledTimes(1);
    expect(emailService.sendVerifyEmail).toHaveBeenCalledTimes(1);
    expect(emailService.sendVerifyEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: createdUser.email, token: expect.any(String) }),
    );
  });
});

describe('AuthService resendVerification', () => {
  it('sends verification email for existing unverified user who is not rate limited', async () => {
    const { service, prisma, emailService } = createMocks();
    const user = {
      id: 'user-resend',
      email: 'resend@example.com',
      status: UserStatus.ACTIVE,
      emailVerifiedAt: null,
      emailVerificationLastSentAt: new Date(Date.now() - 61_000),
      emailVerificationSendCount: 1,
    };

    prisma.user.findUnique
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(user);
    prisma.user.update.mockResolvedValue(user);

    const response = await service.resendVerification(user.email);

    expect(response).toEqual({
      ok: true,
      message: 'If an account exists and is not already verified, we sent a verification email.',
    });
    expect(emailService.sendVerifyEmail).toHaveBeenCalledTimes(1);
    expect(emailService.sendVerifyEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: user.email, token: expect.any(String) }),
    );
  });

  it('does not send verification email when no user exists', async () => {
    const { service, prisma, emailService } = createMocks();
    prisma.user.findUnique.mockResolvedValue(null);

    const response = await service.resendVerification('missing@example.com');

    expect(response).toEqual({
      ok: true,
      message: 'If an account exists and is not already verified, we sent a verification email.',
    });
    expect(emailService.sendVerifyEmail).not.toHaveBeenCalled();
  });

  it('does not send verification email when user is already verified', async () => {
    const { service, prisma, emailService } = createMocks();
    prisma.user.findUnique.mockResolvedValue({
      id: 'verified-user',
      email: 'verified@example.com',
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      emailVerificationLastSentAt: null,
      emailVerificationSendCount: 0,
    });

    const response = await service.resendVerification('verified@example.com');

    expect(response).toEqual({
      ok: true,
      message: 'If an account exists and is not already verified, we sent a verification email.',
    });
    expect(emailService.sendVerifyEmail).not.toHaveBeenCalled();
  });

  it('does not send verification email when resend is rate limited', async () => {
    const { service, prisma, emailService } = createMocks();
    prisma.user.findUnique.mockResolvedValue({
      id: 'limited-user',
      email: 'limited@example.com',
      status: UserStatus.ACTIVE,
      emailVerifiedAt: null,
      emailVerificationLastSentAt: new Date(Date.now() - 30_000),
      emailVerificationSendCount: 4,
    });

    const response = await service.resendVerification('limited@example.com');

    expect(response).toEqual({
      ok: true,
      message: 'If an account exists and is not already verified, we sent a verification email.',
    });
    expect(emailService.sendVerifyEmail).not.toHaveBeenCalled();
  });
});
