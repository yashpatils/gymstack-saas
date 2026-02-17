import { ForbiddenException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClassBookingStatus, MembershipRole, MembershipStatus, NotificationSeverity, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '../users/user.model';
import { EmailProviderError, EmailService } from '../email/email.service';

type TenantHealthResponse = {
  tenantId: string;
  score: number;
  warnings: Array<{ type: NotificationType; severity: NotificationSeverity; title: string; createdAt: string }>;
  metrics: {
    checkinsDeltaPercent: number;
    bookingsDeltaPercent: number;
    cancellationsDeltaPercent: number;
  };
};

@Injectable()
export class RetentionService implements OnModuleInit {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  onModuleInit(): void {
    setInterval(() => {
      void this.runScheduledJobs();
    }, 60 * 60 * 1000);
    void this.runScheduledJobs();
  }

  private async runScheduledJobs(): Promise<void> {
    const now = new Date();
    if (now.getUTCHours() !== 2) {
      return;
    }

    const dayKey = now.toISOString().slice(0, 10);
    await this.runDailyHealthJob(dayKey);

    if (now.getUTCDay() === 1) {
      await this.runWeeklyDigestJob(dayKey);
    }
  }

  private resolveTenantId(user: User): string {
    const tenantId = user.supportMode?.tenantId ?? user.activeTenantId ?? user.orgId;
    if (!tenantId) {
      throw new ForbiddenException('No tenant context selected');
    }
    return tenantId;
  }

  private async assertOwnerOrAdmin(user: User, tenantId: string): Promise<void> {
    if (user.isPlatformAdmin) {
      return;
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        orgId: tenantId,
        userId: user.id,
        role: MembershipRole.TENANT_OWNER,
        status: MembershipStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('Only tenant owners can access tenant health');
    }
  }

  async getTenantHealth(user: User): Promise<TenantHealthResponse> {
    const tenantId = this.resolveTenantId(user);
    await this.assertOwnerOrAdmin(user, tenantId);

    const metrics = await this.buildDeltaMetrics(tenantId);
    const warnings = await this.prisma.notification.findMany({
      where: {
        tenantId,
        type: { in: [NotificationType.ATTENDANCE_DROP, NotificationType.BOOKING_DROP, NotificationType.CANCELLATION_SPIKE] },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { type: true, severity: true, title: true, createdAt: true },
    });

    const score = Math.max(0, Math.min(100, 100 + metrics.checkinsDeltaPercent + metrics.bookingsDeltaPercent - metrics.cancellationsDeltaPercent));

    return {
      tenantId,
      score,
      warnings: warnings.map((warning) => ({ ...warning, createdAt: warning.createdAt.toISOString() })),
      metrics,
    };
  }

  async runDailyHealthJob(dayKey: string): Promise<void> {
    const tenants = await this.prisma.organization.findMany({ select: { id: true, name: true } });
    for (const tenant of tenants) {
      const jobKey = `daily-health:${tenant.id}:${dayKey}`;
      const existing = await this.prisma.jobRun.findUnique({ where: { jobKey }, select: { id: true } });
      if (existing) {
        continue;
      }

      const run = await this.prisma.jobRun.create({ data: { tenantId: tenant.id, jobKey, status: 'success' } });
      try {
        await this.createDailyHealthNotifications(tenant.id, tenant.name);
      } catch (error) {
        await this.prisma.jobRun.update({ where: { id: run.id }, data: { status: 'failed', error: error instanceof Error ? error.message.slice(0, 500) : 'unknown' } });
      }
    }
  }

  async runWeeklyDigestJob(dayKey: string): Promise<void> {
    const tenants = await this.prisma.organization.findMany({ select: { id: true, name: true } });
    for (const tenant of tenants) {
      const jobKey = `weekly-digest:${tenant.id}:${dayKey}`;
      const existing = await this.prisma.jobRun.findUnique({ where: { jobKey }, select: { id: true } });
      if (existing) {
        continue;
      }

      const run = await this.prisma.jobRun.create({ data: { tenantId: tenant.id, jobKey, status: 'success' } });
      try {
        await this.createWeeklyDigest(tenant.id, tenant.name);
      } catch (error) {
        await this.prisma.jobRun.update({ where: { id: run.id }, data: { status: 'failed', error: error instanceof Error ? error.message.slice(0, 500) : 'unknown' } });
      }
    }
  }

  private async buildDeltaMetrics(tenantId: string): Promise<{ checkinsDeltaPercent: number; bookingsDeltaPercent: number; cancellationsDeltaPercent: number }> {
    const now = new Date();
    const currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previousStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [currentCheckins, previousCheckins, currentBookings, previousBookings, currentCancellations, previousCancellations] = await Promise.all([
      this.prisma.classBooking.count({ where: { location: { orgId: tenantId }, status: ClassBookingStatus.CHECKED_IN, updatedAt: { gte: currentStart, lt: now } } }),
      this.prisma.classBooking.count({ where: { location: { orgId: tenantId }, status: ClassBookingStatus.CHECKED_IN, updatedAt: { gte: previousStart, lt: currentStart } } }),
      this.prisma.classBooking.count({ where: { location: { orgId: tenantId }, status: { in: [ClassBookingStatus.BOOKED, ClassBookingStatus.CHECKED_IN] }, createdAt: { gte: currentStart, lt: now } } }),
      this.prisma.classBooking.count({ where: { location: { orgId: tenantId }, status: { in: [ClassBookingStatus.BOOKED, ClassBookingStatus.CHECKED_IN] }, createdAt: { gte: previousStart, lt: currentStart } } }),
      this.prisma.clientMembership.count({ where: { location: { orgId: tenantId }, canceledAt: { gte: currentStart, lt: now } } }),
      this.prisma.clientMembership.count({ where: { location: { orgId: tenantId }, canceledAt: { gte: previousStart, lt: currentStart } } }),
    ]);

    return {
      checkinsDeltaPercent: this.calculateDeltaPercent(currentCheckins, previousCheckins),
      bookingsDeltaPercent: this.calculateDeltaPercent(currentBookings, previousBookings),
      cancellationsDeltaPercent: this.calculateDeltaPercent(currentCancellations, previousCancellations),
    };
  }

  private calculateDeltaPercent(currentValue: number, previousValue: number): number {
    if (previousValue <= 0) {
      return currentValue > 0 ? 100 : 0;
    }
    return Math.round(((currentValue - previousValue) / previousValue) * 100);
  }

  private async createDailyHealthNotifications(tenantId: string, tenantName: string): Promise<void> {
    const owners = await this.prisma.membership.findMany({
      where: { orgId: tenantId, role: MembershipRole.TENANT_OWNER, status: MembershipStatus.ACTIVE },
      select: { userId: true },
    });

    if (!owners.length) {
      return;
    }

    const metrics = await this.buildDeltaMetrics(tenantId);
    const notifications: Array<{ type: NotificationType; severity: NotificationSeverity; title: string; body: string }> = [];

    if (metrics.checkinsDeltaPercent <= -20) {
      notifications.push({
        type: NotificationType.ATTENDANCE_DROP,
        severity: 'warning',
        title: 'Attendance is trending down',
        body: `${tenantName} attendance dropped ${Math.abs(metrics.checkinsDeltaPercent)}% compared to the previous week.`,
      });
    }
    if (metrics.bookingsDeltaPercent <= -20) {
      notifications.push({
        type: NotificationType.BOOKING_DROP,
        severity: 'warning',
        title: 'Bookings dropped week-over-week',
        body: `Bookings are down ${Math.abs(metrics.bookingsDeltaPercent)}% versus the previous 7-day window.`,
      });
    }
    if (metrics.cancellationsDeltaPercent >= 25) {
      notifications.push({
        type: NotificationType.CANCELLATION_SPIKE,
        severity: 'critical',
        title: 'Cancellation spike detected',
        body: `Cancellations increased ${metrics.cancellationsDeltaPercent}% over the prior week.`,
      });
    }

    if (!notifications.length) {
      return;
    }

    for (const owner of owners) {
      for (const notification of notifications) {
        await this.prisma.notification.create({
          data: {
            tenantId,
            userId: owner.userId,
            type: notification.type,
            severity: notification.severity,
            title: notification.title,
            body: notification.body,
            metadata: metrics,
          },
        });
      }
    }
  }

  private async createWeeklyDigest(tenantId: string, tenantName: string): Promise<void> {
    const windowStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const owners = await this.prisma.membership.findMany({
      where: { orgId: tenantId, role: MembershipRole.TENANT_OWNER, status: MembershipStatus.ACTIVE },
      select: { userId: true, user: { select: { email: true } } },
    });

    if (!owners.length) {
      return;
    }

    const [checkins, bookings, newMembers, cancellations, topClass] = await Promise.all([
      this.prisma.classBooking.count({ where: { location: { orgId: tenantId }, status: ClassBookingStatus.CHECKED_IN, updatedAt: { gte: windowStart } } }),
      this.prisma.classBooking.count({ where: { location: { orgId: tenantId }, status: { in: [ClassBookingStatus.BOOKED, ClassBookingStatus.CHECKED_IN] }, createdAt: { gte: windowStart } } }),
      this.prisma.membership.count({ where: { orgId: tenantId, role: MembershipRole.CLIENT, createdAt: { gte: windowStart } } }),
      this.prisma.clientMembership.count({ where: { location: { orgId: tenantId }, canceledAt: { gte: windowStart } } }),
      this.prisma.classBooking.groupBy({
        by: ['sessionId'],
        where: { location: { orgId: tenantId }, createdAt: { gte: windowStart } },
        _count: { sessionId: true },
        orderBy: { _count: { sessionId: 'desc' } },
        take: 1,
      }),
    ]);

    const topSessionId = topClass[0]?.sessionId;
    const topSession = topSessionId
      ? await this.prisma.classSession.findUnique({ where: { id: topSessionId }, select: { classTemplate: { select: { title: true } } } })
      : null;

    for (const owner of owners) {
      await this.prisma.notification.create({
        data: {
          tenantId,
          userId: owner.userId,
          type: NotificationType.WEEKLY_DIGEST,
          severity: 'info',
          title: 'Your weekly tenant digest is ready',
          body: `Check-ins: ${checkins}, bookings: ${bookings}, new members: ${newMembers}, cancellations: ${cancellations}.`,
          metadata: {
            checkins,
            bookings,
            newMembers,
            cancellations,
            topClass: topSession?.classTemplate.title ?? null,
          },
        },
      });

      try {
        await this.emailService.sendEmail({
          to: owner.user.email,
          subject: `Weekly digest: ${tenantName}`,
          template: 'weekly_digest',
          text: `Weekly digest for ${tenantName}: Check-ins ${checkins}, bookings ${bookings}, new members ${newMembers}, cancellations ${cancellations}, top class ${topSession?.classTemplate.title ?? 'N/A'}.`,
          html: `<p>Weekly digest for <strong>${tenantName}</strong></p><ul><li>Check-ins: ${checkins}</li><li>Bookings: ${bookings}</li><li>New members: ${newMembers}</li><li>Cancellations: ${cancellations}</li><li>Top class: ${topSession?.classTemplate.title ?? 'N/A'}</li></ul>`,
          tags: [{ name: 'template', value: 'weekly_digest' }],
        });
      } catch (error) {
        if (error instanceof EmailProviderError) {
          this.logger.error(JSON.stringify({ event: 'weekly_digest_email_failed', providerCode: error.providerCode ?? null, statusCode: error.statusCode ?? null, message: error.message }));
          continue;
        }
        this.logger.error(JSON.stringify({ event: 'weekly_digest_email_failed', message: error instanceof Error ? error.message : 'unknown' }));
      }
    }
  }
}
