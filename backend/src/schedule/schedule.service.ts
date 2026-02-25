import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ClassBookingStatus, ClassSessionStatus, ClientMembershipStatus, MembershipRole, MembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto, UpdateClassDto } from './dto/class.dto';
import { BookSessionDto, CheckInDto, CreateSessionDto, DateRangeQueryDto, UpdateSessionDto } from './dto/session.dto';
import { PushService } from '../push/push.service';
import { WebhooksService } from '../webhooks/webhooks.service';

type RequestUser = {
  id: string;
  orgId?: string;
  activeTenantId?: string;
  activeGymId?: string;
  activeRole?: MembershipRole;
};

@Injectable()
export class ScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
    private readonly webhooksService: WebhooksService,
  ) {}

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

  private async resolveGym(user: RequestUser, gymId: string): Promise<{ tenantId: string; locationId: string; timezone: string }> {
    const tenantId = this.getTenantId(user);
    if (!tenantId) {
      throw new ForbiddenException('Active tenant context required');
    }

    const gym = await this.prisma.gym.findFirst({ where: { id: gymId, orgId: tenantId }, select: { id: true, timezone: true } });
    if (!gym) {
      throw new ForbiddenException('Gym not found in tenant');
    }

    return { tenantId, locationId: gym.id, timezone: gym.timezone };
  }

  private toZonedIso(value: Date, timezone: string): string {
    const parts = new Intl.DateTimeFormat('sv-SE', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(value);
    const token = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
    return `${token('year')}-${token('month')}-${token('day')}T${token('hour')}:${token('minute')}:${token('second')}`;
  }

  private withTimezone<T extends { startsAt: Date; endsAt: Date }>(session: T, timezone: string): T & { timezone: string; startsAtLocal: string; endsAtLocal: string } {
    return {
      ...session,
      timezone,
      startsAtLocal: this.toZonedIso(session.startsAt, timezone),
      endsAtLocal: this.toZonedIso(session.endsAt, timezone),
    };
  }


  private async requireLocationMembership(user: RequestUser, tenantId: string, locationId: string): Promise<void> {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: user.id,
        orgId: tenantId,
        status: MembershipStatus.ACTIVE,
        OR: [
          { role: MembershipRole.TENANT_OWNER, gymId: null },
          { gymId: locationId },
        ],
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('Active gym membership required');
    }
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

  private async canStaffOverride(user: RequestUser, tenantId: string, locationId: string): Promise<boolean> {
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

    return Boolean(membership);
  }

  private async requireClientEligibleToBook(userId: string, locationId: string): Promise<void> {
    const membership = await this.prisma.clientMembership.findFirst({
      where: {
        userId,
        locationId,
        status: { in: [ClientMembershipStatus.active, ClientMembershipStatus.trialing] },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('Membership required to book');
    }
  }

  private parseSessionTimes(startsAtRaw: string, endsAtRaw: string): { startsAt: Date; endsAt: Date } {
    const startsAt = new Date(startsAtRaw);
    const endsAt = new Date(endsAtRaw);
    if (startsAt >= endsAt) {
      throw new BadRequestException('Session end must be after start');
    }
    return { startsAt, endsAt };
  }


  async listClassesByGym(user: RequestUser, gymId: string) {
    const { tenantId, locationId } = await this.resolveGym(user, gymId);
    await this.requireStaffMembership(user, tenantId, locationId);

    return this.prisma.class.findMany({
      where: { locationId },
      include: { coach: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createClassForGym(user: RequestUser, gymId: string, body: CreateClassDto) {
    const { tenantId, locationId } = await this.resolveGym(user, gymId);
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

  async updateClassById(user: RequestUser, classId: string, body: UpdateClassDto) {
    const existing = await this.prisma.class.findUnique({ where: { id: classId }, select: { id: true, locationId: true } });
    if (!existing) {
      throw new NotFoundException('Class not found');
    }

    const { tenantId, locationId } = await this.resolveGym(user, existing.locationId);
    await this.requireStaffMembership(user, tenantId, locationId);

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

  async listClasses(user: RequestUser) {
    const { locationId } = await this.requireLocationContext(user);
    return this.listClassesByGym(user, locationId);
  }

  async createClass(user: RequestUser, body: CreateClassDto) {
    const { locationId } = await this.requireLocationContext(user);
    return this.createClassForGym(user, locationId, body);
  }

  async updateClass(user: RequestUser, classId: string, body: UpdateClassDto) {
    return this.updateClassById(user, classId, body);
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
    await this.requireLocationMembership(user, tenantId, locationId);
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

  async listSessionsByGym(user: RequestUser, gymId: string, query: DateRangeQueryDto) {
    const { tenantId, locationId, timezone } = await this.resolveGym(user, gymId);
    await this.requireLocationMembership(user, tenantId, locationId);
    const { from, to } = this.parseRange(query);
    const sessions = await this.prisma.classSession.findMany({
      where: { locationId, startsAt: { gte: from, lte: to } },
      include: {
        classTemplate: { select: { id: true, title: true, capacity: true } },
        _count: { select: { bookings: { where: { status: { in: [ClassBookingStatus.BOOKED, ClassBookingStatus.CHECKED_IN] } } } } },
      },
      orderBy: { startsAt: 'asc' },
    });
    return sessions.map((entry) => this.withTimezone(entry, timezone));
  }

  async createSession(user: RequestUser, body: CreateSessionDto) {
    const { tenantId, locationId } = await this.requireLocationContext(user);
    await this.requireStaffMembership(user, tenantId, locationId);

    const { startsAt, endsAt } = this.parseSessionTimes(body.startsAt, body.endsAt);

    const classTemplate = await this.prisma.class.findFirst({ where: { id: body.classId, locationId }, select: { id: true } });
    if (!classTemplate) {
      throw new NotFoundException('Class not found');
    }

    const session = await this.prisma.classSession.create({
      data: {
        classId: body.classId,
        locationId,
        startsAt,
        endsAt,
        capacityOverride: body.capacityOverride,
      },
      select: { id: true, classId: true, startsAt: true, endsAt: true },
    });

    await this.webhooksService.emitEvent(tenantId, 'classSession.created', session);

    return session;
  }

  async createSessionForClass(user: RequestUser, classId: string, body: Omit<CreateSessionDto, 'classId'>) {
    const classTemplate = await this.prisma.class.findUnique({ where: { id: classId }, select: { id: true, locationId: true } });
    if (!classTemplate) {
      throw new NotFoundException('Class not found');
    }

    const { tenantId, locationId } = await this.resolveGym(user, classTemplate.locationId);
    await this.requireStaffMembership(user, tenantId, locationId);
    const { startsAt, endsAt } = this.parseSessionTimes(body.startsAt, body.endsAt);

    return this.prisma.classSession.create({
      data: {
        classId,
        locationId,
        startsAt,
        endsAt,
        capacityOverride: body.capacityOverride,
      },
    });
  }

  async updateSession(user: RequestUser, sessionId: string, body: UpdateSessionDto) {
    const existing = await this.prisma.classSession.findUnique({ where: { id: sessionId }, select: { id: true, locationId: true, startsAt: true, endsAt: true } });
    if (!existing) {
      throw new NotFoundException('Session not found');
    }

    const { tenantId, locationId } = await this.resolveGym(user, existing.locationId);
    await this.requireStaffMembership(user, tenantId, locationId);
    const startsAt = body.startsAt ? new Date(body.startsAt) : existing.startsAt;
    const endsAt = body.endsAt ? new Date(body.endsAt) : existing.endsAt;
    if (startsAt >= endsAt) {
      throw new BadRequestException('Session end must be after start');
    }

    return this.prisma.classSession.update({
      where: { id: sessionId },
      data: {
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
    await this.requireClientEligibleToBook(user.id, locationId);

    return this.bookSessionWithOverride(user, sessionId, { userId: user.id }, tenantId, locationId);
  }

  async bookSessionV2(user: RequestUser, sessionId: string, body: BookSessionDto = {}) {
    const session = await this.prisma.classSession.findUnique({ where: { id: sessionId }, select: { id: true, locationId: true } });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const { tenantId, locationId } = await this.resolveGym(user, session.locationId);
    const targetUserId = body.userId ?? user.id;
    const isStaff = await this.canStaffOverride(user, tenantId, locationId);
    if (!isStaff || targetUserId === user.id) {
      await this.requireClientEligibleToBook(targetUserId, locationId);
    }

    return this.bookSessionWithOverride(user, sessionId, { userId: targetUserId }, tenantId, locationId);
  }

  private async bookSessionWithOverride(user: RequestUser, sessionId: string, body: { userId: string }, tenantId: string, locationId: string) {

    const booking = await this.prisma.$transaction(async (tx) => {
      const session = await tx.classSession.findFirst({
        where: { id: sessionId, locationId, status: ClassSessionStatus.SCHEDULED },
        include: { classTemplate: { select: { capacity: true, title: true } } },
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      const existing = await tx.classBooking.findUnique({ where: { sessionId_userId: { sessionId, userId: body.userId } } });
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
          userId: body.userId,
          status: ClassBookingStatus.BOOKED,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    const sessionDetail = await this.prisma.classSession.findUnique({
      where: { id: booking.sessionId },
      include: { classTemplate: { select: { title: true } } },
    });

    if (sessionDetail) {
      await this.pushService.sendBookingConfirmation({
        userId: body.userId,
        tenantId,
        locationId,
        classTitle: sessionDetail.classTemplate.title,
        startsAt: sessionDetail.startsAt,
      });
    }

    return booking;
  }

  async cancelBookingById(user: RequestUser, bookingId: string) {
    const booking = await this.prisma.classBooking.findUnique({ where: { id: bookingId }, include: { session: { select: { id: true, locationId: true } } } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const { tenantId, locationId } = await this.resolveGym(user, booking.session.locationId);
    const isStaff = await this.canStaffOverride(user, tenantId, locationId);
    if (!isStaff && booking.userId !== user.id) {
      throw new ForbiddenException('Not allowed to cancel this booking');
    }
    if (booking.status === ClassBookingStatus.CANCELED) {
      return booking;
    }

    return this.prisma.classBooking.update({
      where: { id: bookingId },
      data: { status: ClassBookingStatus.CANCELED, canceledAt: new Date() },
    });
  }

  async checkInBookingById(user: RequestUser, bookingId: string) {
    const booking = await this.prisma.classBooking.findUnique({ where: { id: bookingId }, include: { session: { select: { locationId: true } } } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const { tenantId, locationId } = await this.resolveGym(user, booking.session.locationId);
    await this.requireStaffMembership(user, tenantId, locationId);

    return this.prisma.classBooking.update({
      where: { id: bookingId },
      data: { status: ClassBookingStatus.CHECKED_IN },
    });
  }

  async cancelMyBooking(user: RequestUser, sessionId: string) {
    const { locationId } = await this.requireLocationContext(user);

    const booking = await this.prisma.classBooking.findUnique({ where: { sessionId_userId: { sessionId, userId: user.id } } });
    if (!booking || booking.locationId !== locationId || booking.status === ClassBookingStatus.CANCELED) {
      throw new NotFoundException('Booking not found');
    }

    const canceled = await this.prisma.classBooking.update({
      where: { id: booking.id },
      data: { status: ClassBookingStatus.CANCELED, canceledAt: new Date() },
      select: { id: true, sessionId: true, userId: true, status: true },
    });

    await this.webhooksService.emitEvent(this.getTenantId(user), 'booking.canceled', canceled);

    return canceled;
  }
}
