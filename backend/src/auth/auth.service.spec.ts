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
