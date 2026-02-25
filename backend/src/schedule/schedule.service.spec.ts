import { ClassBookingStatus, ClassSessionStatus, ClientMembershipStatus, MembershipRole, MembershipStatus, Prisma } from '@prisma/client';
import { ScheduleService } from './schedule.service';

describe('ScheduleService booking capacity transaction', () => {
  const baseUser = { id: 'user-1', activeTenantId: 'tenant-1' };

  it('uses SERIALIZABLE transaction and throws SESSION_FULL when capacity reached', async () => {
    const tx = {
      classSession: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'session-1',
          locationId: 'gym-1',
          status: ClassSessionStatus.SCHEDULED,
          capacityOverride: 1,
          classTemplate: { capacity: 2, title: 'HIIT' },
        }),
      },
      classBooking: {
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const prisma = {
      gym: { findFirst: jest.fn().mockResolvedValue({ id: 'gym-1', timezone: 'UTC' }) },
      membership: { findFirst: jest.fn().mockResolvedValue({ id: 'staff-1', role: MembershipRole.GYM_STAFF_COACH, status: MembershipStatus.ACTIVE }) },
      clientMembership: { findFirst: jest.fn().mockResolvedValue({ id: 'cm-1', status: ClientMembershipStatus.active }) },
      classSession: { findUnique: jest.fn().mockResolvedValue({ id: 'session-1', locationId: 'gym-1' }) },
      $transaction: jest.fn(async (callback: (trx: typeof tx) => unknown, options: { isolationLevel?: Prisma.TransactionIsolationLevel }) => {
        expect(options).toEqual({ isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        return callback(tx);
      }),
    };

    const service = new ScheduleService(prisma as never, { sendBookingConfirmation: jest.fn() } as never, { emitEvent: jest.fn() } as never);

    await expect(service.bookSessionV2(baseUser, 'session-1')).rejects.toThrow('SESSION_FULL');
    expect(tx.classBooking.create).not.toHaveBeenCalled();
  });
});
