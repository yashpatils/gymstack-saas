import { ForbiddenException } from '@nestjs/common';
import { MembershipRole, MembershipStatus } from '@prisma/client';
import { CoachingMessagingService } from './coaching-messaging.service';

const baseUser = {
  id: 'u-coach',
  email: 'coach@example.com',
  activeTenantId: 'tenant-1',
  activeGymId: 'gym-1',
};

describe('CoachingMessagingService', () => {
  const prisma = {
    membership: { findFirst: jest.fn() },
    gym: { findFirst: jest.fn() },
    coachClientAssignment: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
    coachClientMessage: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;

  const auditService = { log: jest.fn() } as any;
  let service: CoachingMessagingService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new CoachingMessagingService(prisma, auditService);
  });

  it('lists coach assignments limited to current user when not admin', async () => {
    prisma.membership.findFirst.mockResolvedValue(null);
    prisma.coachClientAssignment.findMany.mockResolvedValue([]);

    await service.listAssignments(baseUser);

    expect(prisma.coachClientAssignment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        tenantId: 'tenant-1',
        locationId: 'gym-1',
        OR: [{ coachUserId: 'u-coach' }, { clientUserId: 'u-coach' }],
      }),
    }));
  });

  it('allows client to list their own assignments', async () => {
    prisma.membership.findFirst.mockResolvedValue(null);
    prisma.coachClientAssignment.findMany.mockResolvedValue([]);

    await service.listAssignments({ ...baseUser, id: 'u-client' });

    expect(prisma.coachClientAssignment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: [{ coachUserId: 'u-client' }, { clientUserId: 'u-client' }],
      }),
    }));
  });

  it('blocks non-participant from reading messages', async () => {
    prisma.coachClientAssignment.findUnique.mockResolvedValue({
      id: 'a1',
      tenantId: 'tenant-1',
      locationId: 'gym-1',
      coachUserId: 'u-coach',
      clientUserId: 'u-client',
      coach: { id: 'u-coach' },
      client: { id: 'u-client' },
    });

    await expect(service.listMessages({ ...baseUser, id: 'u-other' }, 'a1', {})).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates assignment when admin and roles are valid', async () => {
    prisma.gym.findFirst.mockResolvedValue({ id: 'gym-1' });
    prisma.membership.findFirst
      .mockResolvedValueOnce({ id: 'admin-membership' })
      .mockResolvedValueOnce({ id: 'coach-membership' })
      .mockResolvedValueOnce({ id: 'client-membership' });
    prisma.coachClientAssignment.create.mockResolvedValue({ id: 'a1' });

    await service.createAssignment(
      { ...baseUser, id: 'u-admin' },
      { locationId: 'gym-1', coachUserId: 'u-coach', clientUserId: 'u-client' },
    );

    expect(prisma.membership.findFirst).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({ role: MembershipRole.GYM_STAFF_COACH, status: MembershipStatus.ACTIVE }),
    }));
    expect(prisma.membership.findFirst).toHaveBeenNthCalledWith(3, expect.objectContaining({
      where: expect.objectContaining({ role: MembershipRole.CLIENT, status: MembershipStatus.ACTIVE }),
    }));
  });

  it('sends message and updates assignment timestamp', async () => {
    prisma.coachClientAssignment.findUnique.mockResolvedValue({
      id: 'a1', tenantId: 'tenant-1', locationId: 'gym-1', coachUserId: 'u-coach', clientUserId: 'u-client',
      coach: { id: 'u-coach' }, client: { id: 'u-client' },
    });
    prisma.$transaction.mockImplementation(async (fn: any) => fn({
      coachClientMessage: { create: jest.fn().mockResolvedValue({ id: 'm1', createdAt: new Date(), sender: { id: 'u-coach' } }) },
      coachClientAssignment: { update: jest.fn().mockResolvedValue({}) },
    }));

    const result = await service.sendMessage(baseUser, 'a1', { body: 'hello' });
    expect(result.id).toBe('m1');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('returns paginated messages', async () => {
    prisma.coachClientAssignment.findUnique.mockResolvedValue({
      id: 'a1', tenantId: 'tenant-1', locationId: 'gym-1', coachUserId: 'u-coach', clientUserId: 'u-client',
      coach: { id: 'u-coach' }, client: { id: 'u-client' },
    });
    prisma.coachClientMessage.findMany.mockResolvedValue([
      { id: 'm3', createdAt: new Date('2025-01-03T00:00:00Z') },
      { id: 'm2', createdAt: new Date('2025-01-02T00:00:00Z') },
      { id: 'm1', createdAt: new Date('2025-01-01T00:00:00Z') },
    ]);

    const result = await service.listMessages(baseUser, 'a1', { limit: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe('2025-01-02T00:00:00.000Z');
  });
});
