import { OtpCleanupService } from './otp-cleanup.service';

describe('OtpCleanupService', () => {
  it('deletes matching pending changes and login challenges in chunks', async () => {
    const pendingFindMany = jest
      .fn()
      .mockResolvedValueOnce([{ id: 'pending-1' }])
      .mockResolvedValueOnce([]);
    const loginFindMany = jest
      .fn()
      .mockResolvedValueOnce([{ id: 'login-1' }, { id: 'login-2' }])
      .mockResolvedValueOnce([]);

    const prisma = {
      pendingSensitiveChange: {
        findMany: pendingFindMany,
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      loginOtpChallenge: {
        findMany: loginFindMany,
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    } as any;

    const service = new OtpCleanupService(prisma);
    const now = new Date('2026-03-20T00:00:00.000Z');

    await service.cleanupOtpArtifacts(now);

    expect(pendingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { consumedAt: { lt: new Date('2026-03-13T00:00:00.000Z') } },
            { cancelledAt: { lt: new Date('2026-03-13T00:00:00.000Z') } },
            {
              consumedAt: null,
              cancelledAt: null,
              otpExpiresAt: { lt: new Date('2026-03-18T00:00:00.000Z') },
            },
          ],
        },
      }),
    );
    expect(prisma.pendingSensitiveChange.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['pending-1'] } },
    });
    expect(loginFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { consumedAt: { lt: new Date('2026-03-13T00:00:00.000Z') } },
            {
              consumedAt: null,
              otpExpiresAt: { lt: new Date('2026-03-18T00:00:00.000Z') },
            },
          ],
        },
      }),
    );
    expect(prisma.loginOtpChallenge.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['login-1', 'login-2'] } },
    });
  });
});
