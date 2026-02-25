import { InviteStatus, MembershipRole } from '@prisma/client';
import { InvitesService } from './invites.service';

describe('InvitesService.acceptInviteToken', () => {
  it('creates location membership with invite role and consumes invite', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const findFirst = jest.fn().mockResolvedValue(null);

    const prisma = {
      membership: { findFirst, upsert },
      locationInvite: { updateMany },
      $transaction: jest.fn(async (callback: (tx: unknown) => unknown) => callback({ membership: { upsert }, locationInvite: { updateMany } })),
    };

    const service = new InvitesService(
      prisma as never,
      { enqueue: jest.fn() } as never,
      { assertWithinLimits: jest.fn() } as never,
      { assertMutableAccess: jest.fn(), assertCanInviteStaff: jest.fn() } as never,
      { log: jest.fn() } as never,
      { createForUser: jest.fn() } as never,
    );

    jest.spyOn(service, 'findByToken').mockResolvedValue({
      id: 'invite-1',
      tenantId: 'org-1',
      locationId: 'gym-1',
      role: MembershipRole.TENANT_LOCATION_ADMIN,
      email: 'coach@example.com',
      status: InviteStatus.PENDING,
      revokedAt: null,
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    } as never);

    const result = await service.acceptInviteToken('token-1', {
      id: 'user-1',
      email: 'coach@example.com',
    } as never);

    expect(result).toEqual({
      ok: true,
      alreadyMember: false,
      tenantId: 'org-1',
      gymId: 'gym-1',
      role: MembershipRole.TENANT_LOCATION_ADMIN,
    });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        role: MembershipRole.TENANT_LOCATION_ADMIN,
      }),
      update: { status: 'ACTIVE' },
    }));
    expect(updateMany).toHaveBeenCalled();
    expect((service as any).auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'INVITE_ACCEPTED' }));
    expect((service as any).notificationService.createForUser).toHaveBeenCalledWith(expect.objectContaining({ title: 'Invite accepted' }));
  });

  it('returns idempotent success when invite already accepted and membership exists', async () => {
    const prisma = {
      membership: { findFirst: jest.fn().mockResolvedValue({ id: 'm-1' }) },
    };

    const service = new InvitesService(
      prisma as never,
      { enqueue: jest.fn() } as never,
      { assertWithinLimits: jest.fn() } as never,
      { assertMutableAccess: jest.fn(), assertCanInviteStaff: jest.fn() } as never,
      { log: jest.fn() } as never,
      { createForUser: jest.fn() } as never,
    );

    jest.spyOn(service, 'findByToken').mockResolvedValue({
      id: 'invite-1',
      tenantId: 'org-1',
      locationId: 'gym-1',
      role: MembershipRole.GYM_STAFF_COACH,
      email: null,
      status: InviteStatus.ACCEPTED,
      revokedAt: null,
      consumedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    } as never);

    await expect(service.acceptInviteToken('token-2', { id: 'user-1', email: 'any@example.com' } as never)).resolves.toEqual({
      ok: true,
      alreadyMember: true,
      tenantId: 'org-1',
      gymId: 'gym-1',
      role: MembershipRole.GYM_STAFF_COACH,
    });
  });
});
