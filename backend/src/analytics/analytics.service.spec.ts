import { BadRequestException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  const prisma = {
    membership: { findFirst: jest.fn() },
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    classSession: { findMany: jest.fn() },
    gym: { findFirst: jest.fn() },
  } as any;

  const service = new AnalyticsService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.membership.findFirst.mockResolvedValue({ id: 'm1' });
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.$executeRaw.mockResolvedValue(2);
    prisma.classSession.findMany.mockResolvedValue([]);
    prisma.gym.findFirst.mockResolvedValue({ id: '11111111-1111-4111-8111-111111111111' });
  });

  const user = {
    id: 'user-1',
    email: 'owner@example.com',
    role: 'OWNER',
    orgId: 'tenant-1',
    isPlatformAdmin: false,
  } as any;

  it('rejects non-uuid location filters before query execution', async () => {
    await expect(service.generateInsights(user, "abc' OR 1=1 --")).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('executes insights query with parameterized location filter when valid uuid is provided', async () => {
    const locationId = '11111111-1111-4111-8111-111111111111';

    await service.generateInsights(user, locationId);

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('backfills a date range and runs idempotent upsert rollups per day', async () => {
    const result = await service.backfillDailyMetrics({
      from: '2025-01-01',
      to: '2025-01-03',
      gymId: '11111111-1111-4111-8111-111111111111',
    });

    expect(result).toEqual({
      from: '2025-01-01',
      to: '2025-01-03',
      daysProcessed: 3,
      locationsProcessed: 6,
    });
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(3);
  });

  it('returns gym metrics rows from daily rollup tables', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      {
        date: new Date('2025-01-01T00:00:00.000Z'),
        bookingsCount: 4,
        checkinsCount: 3,
        uniqueClientsCount: 2,
        newClientsCount: 1,
        canceledBookingsCount: 0,
        activeMemberships: 8,
        canceledMemberships: 1,
        newMemberships: 2,
      },
    ]);

    const result = await service.getGymMetrics(user, '11111111-1111-4111-8111-111111111111', {
      from: '2025-01-01',
      to: '2025-01-07',
    });

    expect(result.kpis.bookings).toBe(4);
    expect(result.kpis.checkins).toBe(3);
    expect(result.kpis.latestActiveMemberships).toBe(8);
    expect(result.daily).toHaveLength(1);
  });
});
