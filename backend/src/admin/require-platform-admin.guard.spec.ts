import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common/interfaces/features/execution-context.interface';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RequirePlatformAdminGuard } from './require-platform-admin.guard';

describe('RequirePlatformAdminGuard', () => {
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'PLATFORM_ADMIN_EMAILS') {
        return process.env.PLATFORM_ADMIN_EMAILS;
      }
      return undefined;
    }),
  } as unknown as ConfigService;

  const prismaService = {
    user: {
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService;

  const guard = new RequirePlatformAdminGuard(configService, prismaService);

  const buildContext = (user: { userId?: string; id?: string; sub?: string }): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows allowlisted emails', async () => {
    process.env.PLATFORM_ADMIN_EMAILS = 'admin@gymstack.dev';
    (prismaService.user.findUnique as jest.Mock).mockResolvedValue({ email: 'admin@gymstack.dev' });

    await expect(guard.canActivate(buildContext({ id: 'user-1' }))).resolves.toBe(true);
  });

  it('rejects non platform admins', async () => {
    process.env.PLATFORM_ADMIN_EMAILS = '';
    (prismaService.user.findUnique as jest.Mock).mockResolvedValue({ email: 'member@gymstack.dev' });

    await expect(guard.canActivate(buildContext({ id: 'user-2' }))).rejects.toThrow(ForbiddenException);
  });

  it('rejects missing authenticated user identity', async () => {
    await expect(guard.canActivate(buildContext({}))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects tenant admins who are not allowlisted platform admins', async () => {
    process.env.PLATFORM_ADMIN_EMAILS = 'platform@gymstack.dev';
    (prismaService.user.findUnique as jest.Mock).mockResolvedValue({ email: 'tenant-owner@gymstack.dev' });

    await expect(guard.canActivate(buildContext({ id: 'tenant-user' }))).rejects.toThrow(ForbiddenException);
  });

  it('fails closed when user lookup has no email', async () => {
    process.env.PLATFORM_ADMIN_EMAILS = 'platform@gymstack.dev';
    (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(guard.canActivate(buildContext({ id: 'tenant-user' }))).rejects.toThrow(ForbiddenException);
  });
});
