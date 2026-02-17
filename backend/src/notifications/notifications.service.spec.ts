import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  it('creates a notification through prisma.notification delegate', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'n1', metadata: null });
    const prisma = {
      notification: {
        create,
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const service = new NotificationsService(prisma as never);

    await service.createForUser({
      tenantId: 't1',
      userId: 'u1',
      type: 'SYSTEM',
      title: 'Welcome',
      body: 'Account created',
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        tenantId: 't1',
        userId: 'u1',
        type: 'SYSTEM',
        title: 'Welcome',
        body: 'Account created',
        locationId: null,
        severity: 'info',
        metadata: undefined,
      },
    });
  });
});
