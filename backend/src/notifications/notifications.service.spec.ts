import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  it('creates a notification through prisma.notification delegate', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'n1' });
    const prisma = {
      notification: {
        create,
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    } as any;

    const service = new NotificationsService(prisma);

    await service.createForUser({
      userId: 'u1',
      type: 'signup.success',
      title: 'Welcome',
      body: 'Account created',
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        type: 'signup.success',
        title: 'Welcome',
        body: 'Account created',
      },
    });
  });
});
