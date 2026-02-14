import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common/interfaces/features/execution-context.interface';
import { Role } from '@prisma/client';
import { RequirePlatformAdminGuard } from './require-platform-admin.guard';

describe('RequirePlatformAdminGuard', () => {
  const guard = new RequirePlatformAdminGuard();

  const buildContext = (user: { role?: string; email?: string }): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext);

  it('allows persisted platform admins', () => {
    expect(guard.canActivate(buildContext({ role: Role.PLATFORM_ADMIN }))).toBe(true);
  });

  it('allows allowlisted emails', () => {
    process.env.PLATFORM_ADMIN_EMAILS = 'admin@gymstack.dev';
    expect(guard.canActivate(buildContext({ role: Role.USER, email: 'admin@gymstack.dev' }))).toBe(true);
  });

  it('rejects non platform admins', () => {
    process.env.PLATFORM_ADMIN_EMAILS = '';
    expect(() => guard.canActivate(buildContext({ role: Role.USER, email: 'member@gymstack.dev' }))).toThrow(ForbiddenException);
  });
});
