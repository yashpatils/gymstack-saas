import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ClassBookingStatus, ClassSessionStatus, MembershipRole, MembershipStatus, Prisma, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto, UpdateClassDto } from './dto/class.dto';
import { CheckInDto, CreateSessionDto, DateRangeQueryDto } from './dto/session.dto';

type RequestUser = {
  id: string;
  orgId?: string;
  activeTenantId?: string;
  activeGymId?: string;
  activeRole?: MembershipRole;
};

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  private getTenantId(user: RequestUser): string {
    return user.activeTenantId ?? user.orgId ?? '';
  }

  private async requireLocationContext(user: RequestUser): Promise<{ tenantId: string; locationId: string }> {
    const tenantId = this.getTenantId(user);
    const locationId = user.activeGymId;
    if (!tenantId || !locationId) {
      throw new ForbiddenException('Active location context required');
    }

    const location = await this.prisma.gym.findFirst({ where: { id: locationId, orgId: tenantId }, select: { id: true } });
    if (!location) {
      throw new ForbiddenException('Invalid location context');
    }

    return { tenantId, locationId };
  }

  private async requireStaffMembership(user: RequestUser, tenantId: string, locationId: string): Promise<void> {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: user.id,
        orgId: tenantId,
        status: MembershipStatus.ACTIVE,
        OR: [
          { role: MembershipRole.TENANT_OWNER, gymId: null },
          { role: MembershipRole.TENANT_LOCATION_ADMIN, gymId: locationId },
          { role: MembershipRole.GYM_STAFF_COACH, gymId: locationId },
        ],
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('Staff access required');
    }
  }

  private async requireClientEligibleToBook(user: RequestUser, tenantId: string, locationId: string): Promise<void> {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: user.id,
        orgId: tenantId,
        gymId: locationId,
        role: MembershipRole.CLIENT,
        status: MembershipStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('Client access required');
    }

    const account = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { subscriptionStatus: true },
    });

    const eligibleStatuses = new Set<SubscriptionStatus>([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]);
    if (!account || !eligibleStatuses.has(account.subscriptionStatus)) {
      throw new ForbiddenException('Membership required to book');
    }
  }

  async listClasses(user: RequestUser) {
    const { tenantId, locationId } = await this.requireLocationContext(user);
    await this.requireStaffMembership(user, tenantId, locationId);

    return this.prisma.class.findMany({
      where: { locationId },
      include: { coach: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createClass(user: RequestUser, body: CreateClassDto) {
    const { tenantId, locationId } = await this.requireLocationContext(user);
    await this.requireStaffMembership(user, tenantId, locationId);

    return this.prisma.class.create({
      data: {
        locationId,
        title: body.title,
        description: body.description,
        coachUserId: body.coachUserId,
        capacity: body.capacity,
      },
    });
  }

  async updateClass(user: RequestUser, classId: string, body: UpdateClassDto) {
    const { tenantId, locationId } = await this.requireLocationContext(user);
    await this.requireStaffMembership(user, tenantId, locationId);

    const existing = await this.prisma.class.findFirst({ where: { id: classId, locationId }, select: { id: true } });
    if (!existing) {
      throw new NotFoundException('Class not found');
    }

    return this.prisma.class.update({
      where: { id: classId },
      data: {
        title: body.title,
        description: body.description,
        coachUserId: body.coachUserId,
        capacity: body.capacity,
        isActive: body.isActive,
      },
    });
  }

  async deactivateClass(user: RequestUser, classId: string) {
    return this.updateClass(user, classId, { isActive: false });
  }

  private parseRange(query: DateRangeQueryDto): { from: Date; to: Date } {
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
      throw new BadRequestException('Invalid from/to range');
    }
    return { from, to };
  }

  async listSessions(user: RequestUser, query: DateRangeQueryDto) {
    const { tenantId, locationId } = await this.requireLocationContext(user);
    await this.requireStaffMembership(user, tenantId, locationId);
    const { from, to } = this.parseRange(query);

    return this.prisma.classSession.findMany({
      where: { locationId, startsAt: { gte: from, lte: to } },
      include: {
        classTemplate: { select: { id: true, title: true, capacity: true } },
        _count: { select: { bookings: { where: { status: { in: [ClassBookingStatus.BOOKED, ClassBookingStatus.CHECKED_IN] } } } } },
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  async createSession(user: RequestUser, body: CreateSessionDto) {
    const { tenantId, locationId } = await this.requireLocationContext(user);
    await this.requireStaffMembership(user, tenantId, locationId);

    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(body.endsAt);
    if (startsAt >= endsAt) {
      throw new BadRequestException('Session end must be after start');
    }

    const classTemplate = await this.prisma.class.findFirst({ where: { id: body.classId, locationId }, select: { id: true } });
    if (!classTemplate) {
      throw new NotFoundException('Class not found');
    }

    return this.prisma.classSession.create({
      data: {
        classId: body.classId,
        locationId,
        startsAt,
        endsAt,
        capacityOverride: body.capacityOverride,
      },
    });
  }

  async cancelSession(user: RequestUser, sessionId: string) {
    const { tenantId, locationId } = await this.requireLocationContext(user);
    await this.requireStaffMembership(user, tenantId, locationId);

    const session = await this.prisma.classSession.findFirst({ where: { id: sessionId, locationId }, select: { id: true } });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.prisma.classSession.update({
      where: { id: sessionId },
      data: { status: ClassSessionStatus.CANCELED },
    });
  }

  async roster(user: RequestUser, sessionId: string) {
    const { tenantId, locationId } = await this.requireLocationContext(user);
    await this.requireStaffMembership(user, tenantId, locationId);

    const session = await this.prisma.classSession.findFirst({
      where: { id: sessionId, locationId },
      include: {
        classTemplate: { select: { title: true, capacity: true } },
        bookings: {
          where: { status: { in: [ClassBookingStatus.BOOKED, ClassBookingStatus.CHECKED_IN] } },
          include: { user: { select: { id: true, email: true } } },
          orderBy: { bookedAt: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const effectiveCapacity = session.capacityOverride ?? session.classTemplate.capacity;
    return {
      ...session,
      capacity: effectiveCapacity,
      bookedCount: session.bookings.length,
    };
  }

  async checkIn(user: RequestUser, sessionId: string, body: CheckInDto) {
    const { tenantId, locationId } = await this.requireLocationContext(user);
    await this.requireStaffMembership(user, tenantId, locationId);

    const booking = await this.prisma.classBooking.findFirst({ where: { sessionId, locationId, userId: body.userId } });
    if (!booking || booking.status === ClassBookingStatus.CANCELED) {
      throw new NotFoundException('Booking not found');
    }

    return this.prisma.classBooking.update({ where: { id: booking.id }, data: { status: ClassBookingStatus.CHECKED_IN } });
  }

  async browseSchedule(user: RequestUser, query: DateRangeQueryDto) {
    const { tenantId, locationId } = await this.requireLocationContext(user);
    const { from, to } = this.parseRange(query);

    const sessions = await this.prisma.classSession.findMany({
      where: { locationId, status: ClassSessionStatus.SCHEDULED, startsAt: { gte: from, lte: to } },
      include: {
        classTemplate: { select: { title: true, capacity: true } },
        bookings: {
          where: { status: { in: [ClassBookingStatus.BOOKED, ClassBookingStatus.CHECKED_IN] } },
          select: { userId: true },
        },
      },
      orderBy: { startsAt: 'asc' },
    });

    return sessions.map((session) => {
      const capacity = session.capacityOverride ?? session.classTemplate.capacity;
      const bookedCount = session.bookings.length;
      const isBookedByMe = session.bookings.some((booking) => booking.userId === user.id);
      return {
        sessionId: session.id,
        classTitle: session.classTemplate.title,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        capacity,
        bookedCount,
        isBookedByMe,
      };
    });
  }

  async myBookings(user: RequestUser, query: DateRangeQueryDto) {
    const { from, to } = this.parseRange(query);
    const { locationId } = await this.requireLocationContext(user);

    return this.prisma.classBooking.findMany({
      where: {
        userId: user.id,
        locationId,
        status: { in: [ClassBookingStatus.BOOKED, ClassBookingStatus.CHECKED_IN] },
        session: { startsAt: { gte: from, lte: to }, status: ClassSessionStatus.SCHEDULED },
      },
      include: { session: { include: { classTemplate: { select: { title: true } } } } },
      orderBy: { session: { startsAt: 'asc' } },
    });
  }

  async bookSession(user: RequestUser, sessionId: string) {
    const { tenantId, locationId } = await this.requireLocationContext(user);
    await this.requireClientEligibleToBook(user, tenantId, locationId);

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.classSession.findFirst({
        where: { id: sessionId, locationId, status: ClassSessionStatus.SCHEDULED },
        include: { classTemplate: { select: { capacity: true } } },
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      const existing = await tx.classBooking.findUnique({ where: { sessionId_userId: { sessionId, userId: user.id } } });
      if (existing && existing.status !== ClassBookingStatus.CANCELED) {
        return existing;
      }

      const currentCount = await tx.classBooking.count({
        where: { sessionId, status: { in: [ClassBookingStatus.BOOKED, ClassBookingStatus.CHECKED_IN] } },
      });

      const capacity = session.capacityOverride ?? session.classTemplate.capacity;
      if (currentCount >= capacity) {
        throw new ConflictException('SESSION_FULL');
      }

      if (existing) {
        return tx.classBooking.update({
          where: { id: existing.id },
          data: { status: ClassBookingStatus.BOOKED, bookedAt: new Date(), canceledAt: null },
        });
      }

      return tx.classBooking.create({
        data: {
          sessionId,
          locationId,
          userId: user.id,
          status: ClassBookingStatus.BOOKED,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async cancelMyBooking(user: RequestUser, sessionId: string) {
    const { locationId } = await this.requireLocationContext(user);

    const booking = await this.prisma.classBooking.findUnique({ where: { sessionId_userId: { sessionId, userId: user.id } } });
    if (!booking || booking.locationId !== locationId || booking.status === ClassBookingStatus.CANCELED) {
      throw new NotFoundException('Booking not found');
    }

    return this.prisma.classBooking.update({
      where: { id: booking.id },
      data: { status: ClassBookingStatus.CANCELED, canceledAt: new Date() },
    });
  }
}
