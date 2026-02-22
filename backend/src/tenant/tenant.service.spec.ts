import { ForbiddenException } from '@nestjs/common';
import { TenantService } from './tenant.service';

describe('TenantService.checkSlugAvailability', () => {
  const findUnique = jest.fn();

  const prisma = {
    gym: { findUnique },
  } as any;

  const service = new TenantService(prisma, {} as any, { log: jest.fn() } as any, { sendTemplatedActionEmail: jest.fn() } as any);

  beforeEach(() => {
    findUnique.mockReset();
  });

  it('returns available=true for an unused valid slug', async () => {
    findUnique.mockResolvedValueOnce(null);

    const result = await service.checkSlugAvailability(
      { id: 'u1', email: 'owner@gym.test', activeTenantId: 't1', orgId: 't1' } as any,
      'Sunnyvale-Strength',
    );

    expect(result).toEqual({
      slug: 'sunnyvale-strength',
      available: true,
      reserved: false,
      validFormat: true,
      reason: undefined,
    });
    expect(findUnique).toHaveBeenCalledWith({ where: { slug: 'sunnyvale-strength' }, select: { id: true, orgId: true } });
  });

  it('returns reserved=true for reserved slug', async () => {
    const result = await service.checkSlugAvailability(
      { id: 'u1', email: 'owner@gym.test', activeTenantId: 't1', orgId: 't1' } as any,
      'admin',
    );

    expect(result).toEqual({
      slug: 'admin',
      available: false,
      reserved: true,
      validFormat: false,
      reason: 'This slug is reserved',
    });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('returns available=false when slug is taken by another tenant', async () => {
    findUnique.mockResolvedValueOnce({ id: 'gym-2', orgId: 't2' });

    const result = await service.checkSlugAvailability(
      { id: 'u1', email: 'owner@gym.test', activeTenantId: 't1', orgId: 't1' } as any,
      'iron-house',
    );

    expect(result.available).toBe(false);
    expect(result.reason?.toLowerCase()).toContain('already in use');
  });

  it('returns available=true when slug belongs to requester tenant', async () => {
    findUnique.mockResolvedValueOnce({ id: 'gym-2', orgId: 't1' });

    const result = await service.checkSlugAvailability(
      { id: 'u1', email: 'owner@gym.test', activeTenantId: 't1', orgId: 't1' } as any,
      'iron-house',
    );

    expect(result.available).toBe(true);
  });

  it('throws when tenant context is missing', async () => {
    await expect(
      service.checkSlugAvailability(
        { id: 'u1', email: 'owner@gym.test', activeTenantId: null, orgId: null } as any,
        'any-slug',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
