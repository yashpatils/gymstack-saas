import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MembershipRole, MembershipStatus, Prisma } from '@prisma/client';
import { GymsService } from './gyms.service';

describe('GymsService slug handling', () => {
  const prisma = {
    gym: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    membership: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;

  const service = new GymsService(
    prisma,
    { get: jest.fn() } as any,
    {} as any,
    { assertWithinLimits: jest.fn() } as any,
    { log: jest.fn() } as any,
    { assertCanCreateLocation: jest.fn() } as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns reserved false/available true for a free slug', async () => {
    prisma.gym.findUnique.mockResolvedValue(null);

    await expect(service.checkSlugAvailability({ orgId: 'org-1' } as any, 'new-gym')).resolves.toEqual({
      slug: 'new-gym',
      available: true,
      reserved: false,
      validFormat: true,
      reason: undefined,
    });
  });

  it('returns reserved slug metadata when slug is reserved', async () => {
    await expect(service.checkSlugAvailability({ orgId: 'org-1' } as any, 'admin')).resolves.toEqual({
      slug: 'admin',
      available: false,
      reserved: true,
      validFormat: false,
      reason: 'This slug is reserved',
    });
  });

  it('rejects reserved slug on create', async () => {
    prisma.membership.findMany.mockResolvedValue([{ orgId: 'org-1', role: MembershipRole.TENANT_OWNER, status: MembershipStatus.ACTIVE }]);
    prisma.membership.findFirst.mockResolvedValue({ id: 'm-1' });

    await expect(
      service.createGymForUser(
        { id: 'user-1', orgId: 'org-1' } as any,
        { name: 'Pulse', slug: 'admin', timezone: 'UTC' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when checking slug availability without tenant context', async () => {
    await expect(service.checkSlugAvailability({ orgId: null } as any, 'new-gym')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('maps prisma unique errors to SLUG_TAKEN', async () => {
    prisma.membership.findMany.mockResolvedValue([{ orgId: 'org-1', role: MembershipRole.TENANT_OWNER, status: MembershipStatus.ACTIVE }]);
    prisma.membership.findFirst.mockResolvedValue({ id: 'm-1' });
    prisma.gym.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('dup', {
      code: 'P2002',
      clientVersion: 'x',
      meta: { target: ['slug'] },
    } as any));

    await expect(
      service.createGymForUser(
        { id: 'user-1', orgId: 'org-1' } as any,
        { name: 'Pulse', slug: 'pulse', timezone: 'UTC' },
      ),
    ).rejects.toMatchObject({
      response: {
        error: { code: 'SLUG_TAKEN' },
      },
    });
  });

  it('rejects invalid timezone on create', async () => {
    prisma.membership.findMany.mockResolvedValue([{ orgId: 'org-1', role: MembershipRole.TENANT_OWNER, status: MembershipStatus.ACTIVE }]);
    prisma.membership.findFirst.mockResolvedValue({ id: 'm-1' });

    await expect(
      service.createGymForUser(
        { id: 'user-1', orgId: 'org-1' } as any,
        { name: 'Pulse', slug: 'pulse', timezone: 'Mars/Phobos' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps schema mismatch to DB_SCHEMA_MISMATCH', async () => {
    prisma.membership.findMany.mockResolvedValue([{ orgId: 'org-1', role: MembershipRole.TENANT_OWNER, status: MembershipStatus.ACTIVE }]);
    prisma.membership.findFirst.mockResolvedValue({ id: 'm-1' });
    prisma.gym.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('missing column', {
      code: 'P2022',
      clientVersion: 'x',
      meta: { column: 'timezone' },
    } as any));

    await expect(
      service.createGymForUser(
        { id: 'user-1', orgId: 'org-1' } as any,
        { name: 'Pulse', slug: 'pulse', timezone: 'UTC' },
      ),
    ).rejects.toMatchObject({
      response: {
        error: { code: 'DB_SCHEMA_MISMATCH' },
      },
    });
  });
});
