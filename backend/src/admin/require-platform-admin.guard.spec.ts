import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common/interfaces/features/execution-context.interface';
import { ConfigService } from '@nestjs/config';
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

  const guard = new RequirePlatformAdminGuard(configService);

  const buildContext = (user: { role?: string; email?: string }): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext);

  it('allows allowlisted emails', () => {
    process.env.PLATFORM_ADMIN_EMAILS = 'admin@gymstack.dev';
    expect(guard.canActivate(buildContext({ email: 'admin@gymstack.dev' }))).toBe(true);
  });

  it('rejects non platform admins', () => {
    process.env.PLATFORM_ADMIN_EMAILS = '';
    expect(() => guard.canActivate(buildContext({ email: 'member@gymstack.dev' }))).toThrow(ForbiddenException);
  });
});
