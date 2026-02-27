import { ForbiddenException } from '@nestjs/common';
import { GymsController } from './gyms.controller';
import { UserRole } from '../users/user.model';

describe('GymsController', () => {
  const gymsService = {
    listGyms: jest.fn(),
    createGymForUser: jest.fn(),
    getGym: jest.fn(),
    updateGymForUser: jest.fn(),
    updateGym: jest.fn(),
    deleteGymForUser: jest.fn(),
    checkSlugAvailability: jest.fn(),
  };

  const invitesService = {
    createGymInvite: jest.fn(),
  };

  let controller: GymsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new GymsController(gymsService as never, invitesService as never);
  });

  it('lists gyms', async () => {
    gymsService.listGyms.mockResolvedValue([{ id: 'gym-1' }]);

    await expect(
      controller.listGyms({ user: { id: 'user-1', email: 'owner@example.com', role: UserRole.Owner, orgId: 'org-1' } }),
    ).resolves.toEqual([{ id: 'gym-1' }]);
    expect(gymsService.listGyms).toHaveBeenCalled();
  });

  it('creates a gym for the authenticated user', async () => {
    gymsService.createGymForUser.mockResolvedValue({ id: 'gym-1' });

    await expect(
      controller.createGym(
        { name: 'Pulse Fitness', slug: 'pulse-fitness', timezone: 'America/Los_Angeles' },
        { user: { id: 'user-1', email: 'owner@example.com', role: UserRole.Owner, orgId: 'org-1' } },
      ),
    ).resolves.toEqual({ id: 'gym-1' });
  });

  it('throws when creating a gym without a user', () => {
    expect(() => controller.createGym({ name: 'Pulse Fitness', slug: 'pulse-fitness', timezone: 'America/Los_Angeles' }, {})).toThrow(
      ForbiddenException,
    );
  });

  it('checks gym slug availability', async () => {
    gymsService.checkSlugAvailability = jest.fn().mockResolvedValue({ available: true, slug: 'pulse-fitness' });

    await expect(
      controller.checkSlugAvailability(
        { slug: 'pulse-fitness' },
        { user: { id: 'user-1', email: 'owner@example.com', role: UserRole.Owner, orgId: 'org-1' } },
      ),
    ).resolves.toEqual({ available: true, slug: 'pulse-fitness' });
  });

  it('gets a gym', async () => {
    gymsService.getGym.mockResolvedValue({ id: 'gym-2' });

    await expect(
      controller.getGym('gym-2', {
        user: { id: 'user-1', email: 'owner@example.com', role: UserRole.Owner, orgId: 'org-1' },
      }),
    ).resolves.toEqual({ id: 'gym-2' });
  });

  it('updates a gym for the current user', async () => {
    gymsService.updateGymForUser.mockResolvedValue({ id: 'gym-3' });

    await expect(
      controller.updateGym(
        'gym-3',
        { name: 'Updated' },
        { user: { id: 'user-1', email: 'owner@example.com', role: UserRole.Owner, orgId: 'org-1' } },
      ),
    ).resolves.toEqual({ id: 'gym-3' });
  });

  it('throws when updating a gym without a user', () => {
    expect(() => controller.updateGym('gym-3', { name: 'Updated' }, {})).toThrow(
      ForbiddenException,
    );
  });

  it('updates a gym owner as admin', async () => {
    gymsService.updateGym.mockResolvedValue({ id: 'gym-4' });

    await expect(
      controller.updateGymOwner('gym-4', { name: 'Admin Updated' }, {
        user: { id: 'user-1', email: 'admin@example.com', role: UserRole.Admin, orgId: 'org-1' },
      }),
    ).resolves.toEqual({ id: 'gym-4' });
  });

  it('deletes a gym for the current user', async () => {
    gymsService.deleteGymForUser.mockResolvedValue({ id: 'gym-5' });

    await expect(
      controller.deleteGym('gym-5', {
        user: { id: 'user-1', email: 'owner@example.com', role: UserRole.Owner, orgId: 'org-1' },
      }),
    ).resolves.toEqual({ id: 'gym-5' });
  });

  it('throws when deleting a gym without a user', () => {
    expect(() => controller.deleteGym('gym-5', {})).toThrow(ForbiddenException);
  });
});
