import { ForbiddenException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UserRole } from './user.model';

describe('UsersController', () => {
  const usersService = {
    listUsers: jest.fn(),
    getUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
  };

  let controller: UsersController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UsersController(usersService as never);
  });

  it('lists users', async () => {
    usersService.listUsers.mockResolvedValue([{ id: '1' }]);

    await expect(controller.listUsers({ user: { id: '1', email: 'admin@example.com', role: UserRole.Admin, orgId: 'org-1' } })).resolves.toEqual([{ id: '1' }]);
    expect(usersService.listUsers).toHaveBeenCalled();
  });

  it('returns user details for admins', async () => {
    usersService.getUser.mockResolvedValue({ id: '2' });

    await expect(
      controller.getUser('2', {
        user: { id: '1', email: 'admin@example.com', role: UserRole.Admin, orgId: 'org-1' },
      }),
    ).resolves.toEqual({ id: '2' });
  });

  it('returns user details for the same user', async () => {
    usersService.getUser.mockResolvedValue({ id: '2' });

    await expect(
      controller.getUser('2', {
        user: { id: '2', email: 'user@example.com', role: UserRole.User, orgId: 'org-1' },
      }),
    ).resolves.toEqual({ id: '2' });
  });

  it('throws when non-admin requests another user', () => {
    expect(() =>
      controller.getUser('2', {
        user: { id: '1', email: 'user@example.com', role: UserRole.User, orgId: 'org-1' },
      }),
    ).toThrow(ForbiddenException);
  });

  it('updates a user when authorized', async () => {
    usersService.updateUser.mockResolvedValue({ id: '1', name: 'Updated' });

    await expect(
      controller.updateUser(
        '1',
        { name: 'Updated' },
        { user: { id: '1', email: 'user@example.com', role: UserRole.User, orgId: 'org-1' } },
      ),
    ).resolves.toEqual({ id: '1', name: 'Updated' });
  });

  it('throws when update is unauthorized', () => {
    expect(() =>
      controller.updateUser(
        '2',
        { name: 'Updated' },
        { user: { id: '1', email: 'user@example.com', role: UserRole.User, orgId: 'org-1' } },
      ),
    ).toThrow(ForbiddenException);
  });

  it('deletes a user', async () => {
    usersService.deleteUser.mockResolvedValue({ id: '1' });

    await expect(controller.deleteUser('1', { user: { id: '1', email: 'admin@example.com', role: UserRole.Admin, orgId: 'org-1' } })).resolves.toEqual({ id: '1' });
    expect(usersService.deleteUser).toHaveBeenCalledWith('1');
  });
});
