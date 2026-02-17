import { BadRequestException, Injectable } from '@nestjs/common';
import { ClassBookingStatus, ClassSessionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { PaginatedResponse } from './public-api.types';
import { WebhooksService } from '../webhooks/webhooks.service';

@Injectable()
export class PublicApiService {
  constructor(private readonly prisma: PrismaService, private readonly webhooksService: WebhooksService) {}

  async locations(tenantId: string, page: number, pageSize: number): Promise<PaginatedResponse<{ id: string; name: string; timezone: string }>> {
    const where = { orgId: tenantId };
    const [data, total] = await Promise.all([
      this.prisma.gym.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, timezone: true } }),
      this.prisma.gym.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async members(tenantId: string, page: number, pageSize: number): Promise<PaginatedResponse<{ id: string; email: string; createdAt: Date }>> {
    const where = { orgId: tenantId };
    const [memberships, total] = await Promise.all([
      this.prisma.membership.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' }, select: { user: { select: { id: true, email: true, createdAt: true } } } }),
      this.prisma.membership.count({ where }),
    ]);
    return { data: memberships.map((membership) => membership.user), total, page, pageSize };
  }

  async classes(tenantId: string, page: number, pageSize: number): Promise<PaginatedResponse<{ id: string; title: string; locationId: string; isActive: boolean }>> {
    const where = { location: { orgId: tenantId } };
    const [data, total] = await Promise.all([
      this.prisma.class.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, locationId: true, isActive: true } }),
      this.prisma.class.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async sessions(tenantId: string, query: { from?: string; to?: string; page: number; pageSize: number }): Promise<PaginatedResponse<{ id: string; classId: string; locationId: string; startsAt: Date; endsAt: Date }>> {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    if (from && Number.isNaN(from.getTime())) throw new BadRequestException('Invalid from date');
    if (to && Number.isNaN(to.getTime())) throw new BadRequestException('Invalid to date');

    const where = {
      location: { orgId: tenantId },
      status: ClassSessionStatus.SCHEDULED,
      startsAt: { gte: from, lte: to },
    };
    const [data, total] = await Promise.all([
      this.prisma.classSession.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy: { startsAt: 'asc' }, select: { id: true, classId: true, locationId: true, startsAt: true, endsAt: true } }),
      this.prisma.classSession.count({ where }),
    ]);
    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async createBooking(tenantId: string, input: { sessionId: string; memberEmail: string }): Promise<{ bookingId: string; status: ClassBookingStatus }> {
    const session = await this.prisma.classSession.findFirst({ where: { id: input.sessionId, location: { orgId: tenantId }, status: ClassSessionStatus.SCHEDULED }, select: { id: true, locationId: true } });
    if (!session) throw new BadRequestException('Session not found');

    const user = await this.prisma.user.findFirst({ where: { email: input.memberEmail, memberships: { some: { orgId: tenantId } } }, select: { id: true } });
    if (!user) throw new BadRequestException('Member not found');

    const booking = await this.prisma.classBooking.upsert({
      where: { sessionId_userId: { sessionId: session.id, userId: user.id } },
      update: { status: ClassBookingStatus.BOOKED, canceledAt: null },
      create: { sessionId: session.id, userId: user.id, locationId: session.locationId, status: ClassBookingStatus.BOOKED },
      select: { id: true, status: true },
    });

    await this.webhooksService.emitEvent(tenantId, 'booking.created', {
      bookingId: booking.id,
      sessionId: session.id,
      memberEmail: input.memberEmail,
      status: booking.status,
    });

    return { bookingId: booking.id, status: booking.status };
  }
}
