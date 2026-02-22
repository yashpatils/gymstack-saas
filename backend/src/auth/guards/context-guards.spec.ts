import { ExecutionContext } from '@nestjs/common';
import { MembershipRole, MembershipStatus } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { TenantGuard } from './tenant.guard';
import { LocationGuard } from './location.guard';
import { RolesGuard } from './roles.guard';

function createExecutionContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;
}

describe('Context guards', () => {
  it('TenantGuard rejects missing tenant header', async () => {
    const prisma = { membership: { findFirst: jest.fn() } } as any;
    const guard = new TenantGuard(prisma);
    await expect(guard.canActivate(createExecutionContext({ headers: {}, user: { userId: 'u1' } }))).rejects.toMatchObject({
      response: { code: 'NO_ACTIVE_TENANT' },
    });
  });

  it('LocationGuard rejects missing location header', async () => {
    const prisma = { gym: { findUnique: jest.fn() }, membership: { findFirst: jest.fn() } } as any;
    const guard = new LocationGuard(prisma);
    await expect(guard.canActivate(createExecutionContext({ headers: {}, user: { userId: 'u1' } }))).rejects.toMatchObject({
      response: { code: 'NO_ACTIVE_LOCATION' },
    });
  });

  it('RolesGuard blocks unauthorized roles', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([MembershipRole.TENANT_OWNER]) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() =>
      guard.canActivate(
        createExecutionContext({
          membership: { role: MembershipRole.GYM_STAFF_COACH, status: MembershipStatus.ACTIVE },
          user: {},
        }),
      ),
    ).toThrow();
  });
});
