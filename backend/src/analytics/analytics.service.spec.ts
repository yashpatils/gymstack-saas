import { BadRequestException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  const prisma = {
    membership: { findFirst: jest.fn() },
    $queryRaw: jest.fn(),
    classSession: { findMany: jest.fn() },
  } as any;

  const service = new AnalyticsService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.membership.findFirst.mockResolvedValue({ id: 'm1' });
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.classSession.findMany.mockResolvedValue([]);
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
});
