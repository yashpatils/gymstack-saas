import { BadRequestException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  const prisma = {
    membership: { findFirst: jest.fn() },
    $queryRawUnsafe: jest.fn(),
    classSession: { findMany: jest.fn() },
  } as any;

  const service = new AnalyticsService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.membership.findFirst.mockResolvedValue({ id: 'm1' });
    prisma.$queryRawUnsafe.mockResolvedValue([]);
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
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('executes insights query with parameterized location filter when valid uuid is provided', async () => {
    const locationId = '11111111-1111-4111-8111-111111111111';

    await service.generateInsights(user, locationId);

    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('($2::text IS NULL OR dlm."locationId" = $2::text)'), 'tenant-1', locationId);
  });
});
