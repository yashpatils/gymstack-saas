import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MembershipPlanInterval } from '@prisma/client';
import { LocationMembershipsService } from './location-memberships.service';

describe('LocationMembershipsService plans', () => {
  const prisma = {
    membership: { findFirst: jest.fn() },
    membershipPlan: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    clientMembership: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;

  const adminUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: 'ADMIN',
    status: 'ACTIVE',
    activeTenantId: 'tenant-1',
  } as any;

  let service: LocationMembershipsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LocationMembershipsService(prisma);
    prisma.membership.findFirst.mockResolvedValue({ id: 'm-1' });
  });

  it('lists plans scoped to gym', async () => {
    prisma.membershipPlan.findMany.mockResolvedValue([
      {
        id: 'plan-1',
        locationId: 'gym-1',
        name: 'Gold',
        description: null,
        priceCents: 1000,
        interval: MembershipPlanInterval.month,
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);

    const plans = await service.listPlansForGym(adminUser, 'gym-1');

    expect(plans).toHaveLength(1);
    expect(plans[0]?.locationId).toBe('gym-1');
    expect(prisma.membershipPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { locationId: 'gym-1' } }),
    );
  });

  it('creates plans scoped to gym', async () => {
    prisma.membershipPlan.create.mockResolvedValue({
      id: 'plan-2',
      locationId: 'gym-2',
      name: 'Silver',
      description: null,
      priceCents: 500,
      interval: MembershipPlanInterval.month,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await service.createPlanForGym(adminUser, 'gym-2', {
      name: 'Silver',
      interval: MembershipPlanInterval.month,
      priceCents: 500,
    });

    expect(prisma.membershipPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ locationId: 'gym-2', name: 'Silver' }),
      }),
    );
  });

  it('updates plan only when plan belongs to gym', async () => {
    prisma.membershipPlan.findFirst.mockResolvedValue(null);

    await expect(
      service.updatePlanForGym(adminUser, 'gym-1', 'plan-404', { name: 'Renamed' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects when user has no admin membership in gym', async () => {
    prisma.membership.findFirst.mockResolvedValue(null);

    await expect(service.listPlansForGym(adminUser, 'gym-1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
