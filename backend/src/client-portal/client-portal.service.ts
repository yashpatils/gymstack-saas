import { ForbiddenException, Injectable } from '@nestjs/common';
import { ClientMembershipStatus, ClassBookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientPortalService {
  constructor(private readonly prisma: PrismaService) {}

  async getClientPortal(userId: string) {
    const memberships = await this.prisma.clientMembership.findMany({
      where: {
        userId,
        status: {
          in: [ClientMembershipStatus.active, ClientMembershipStatus.trialing, ClientMembershipStatus.paused, ClientMembershipStatus.past_due],
        },
      },
      include: {
        location: { select: { id: true, name: true } },
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (memberships.length === 0) {
      throw new ForbiddenException('Client portal is only available for active clients.');
    }

    const upcomingBookings = await this.prisma.classBooking.findMany({
      where: {
        userId,
        status: ClassBookingStatus.BOOKED,
        session: { startsAt: { gte: new Date() } },
      },
      include: {
        session: {
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            classTemplate: {
              select: { title: true },
            },
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { session: { startsAt: 'asc' } },
      take: 10,
    });

    return {
      memberships: memberships.map((membership) => ({
        id: membership.id,
        status: membership.status,
        startAt: membership.startAt.toISOString(),
        endAt: membership.endAt?.toISOString() ?? null,
        location: membership.location
          ? {
            id: membership.location.id,
            name: membership.location.name,
          }
          : null,
        plan: membership.plan
          ? {
            id: membership.plan.id,
            name: membership.plan.name,
            interval: membership.plan.interval,
            priceCents: membership.plan.priceCents,
          }
          : null,
      })),
      upcomingBookings: upcomingBookings.map((booking) => ({
        id: booking.id,
        location: {
          id: booking.location.id,
          name: booking.location.name,
        },
        classTitle: booking.session.classTemplate.title,
        startsAt: booking.session.startsAt.toISOString(),
        endsAt: booking.session.endsAt.toISOString(),
      })),
      planInfo: memberships[0]?.plan
        ? {
          id: memberships[0].plan.id,
          name: memberships[0].plan.name,
          interval: memberships[0].plan.interval,
          priceCents: memberships[0].plan.priceCents,
        }
        : null,
    };
  }
}
