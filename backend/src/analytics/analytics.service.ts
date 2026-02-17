import { ForbiddenException, Injectable } from '@nestjs/common';
import { ClassBookingStatus, ClientMembershipStatus, MembershipRole, MembershipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '../users/user.model';
import { AskAiDto, AskScope } from './dto/ask-ai.dto';
import { AnalyticsRange, AnalyticsTrendMetric } from './dto/analytics-query.dto';

type InsightSeverity = 'info' | 'warning' | 'critical';

type InsightResponse = {
  id: string;
  severity: InsightSeverity;
  title: string;
  summary: string;
  recommendedActions: string[];
  metricRefs: string[];
  createdAt: string;
  locationId: string | null;
};

type AskResponse = {
  answer: string;
  data: Record<string, unknown>;
  citations: string[];
};

type DbRow = Record<string, unknown>;

type DateRange = { start: Date; end: Date; days: number };

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

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

    const ownerMembership = await this.prisma.membership.findFirst({
      where: {
        orgId: tenantId,
        userId: user.id,
        role: MembershipRole.TENANT_OWNER,
      },
      select: { id: true },
    });

    if (!ownerMembership) {
      throw new ForbiddenException('Only tenant owners can access AI analytics');
    }
  }

  private async assertOwnerOrManager(user: User, tenantId: string): Promise<void> {
    if (user.isPlatformAdmin) {
      return;
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        orgId: tenantId,
        userId: user.id,
        role: { in: [MembershipRole.TENANT_OWNER, MembershipRole.TENANT_LOCATION_ADMIN] },
        status: MembershipStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('Only tenant owners and managers can access analytics');
    }
  }

  private getDateRange(range: AnalyticsRange): DateRange {
    const days = range === '30d' ? 30 : 7;
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
    return { start, end, days };
  }

  private toDateKey(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  async getOverview(user: User, range: AnalyticsRange): Promise<{
    mrrCents: number;
    activeMemberships: number;
    newMemberships: number;
    canceledMemberships: number;
    bookings: number;
    cancellations: number;
    checkins: number;
    uniqueActiveClients: number;
  }> {
    const tenantId = this.resolveTenantId(user);
    await this.assertOwnerOrManager(user, tenantId);
    const { start, end } = this.getDateRange(range);

    const [activeMemberships, newMemberships, canceledMemberships, bookings, cancellations, checkins, uniqueClients, activeMembershipRows] =
      await Promise.all([
        this.prisma.clientMembership.count({ where: { location: { orgId: tenantId }, status: ClientMembershipStatus.active } }),
        this.prisma.clientMembership.count({ where: { location: { orgId: tenantId }, createdAt: { gte: start, lte: end } } }),
        this.prisma.clientMembership.count({ where: { location: { orgId: tenantId }, canceledAt: { gte: start, lte: end } } }),
        this.prisma.classBooking.count({ where: { location: { orgId: tenantId }, createdAt: { gte: start, lte: end } } }),
        this.prisma.classBooking.count({ where: { location: { orgId: tenantId }, status: ClassBookingStatus.CANCELED, updatedAt: { gte: start, lte: end } } }),
        this.prisma.classBooking.count({ where: { location: { orgId: tenantId }, status: ClassBookingStatus.CHECKED_IN, updatedAt: { gte: start, lte: end } } }),
        this.prisma.classBooking.findMany({
          where: { location: { orgId: tenantId }, createdAt: { gte: start, lte: end } },
          distinct: ['userId'],
          select: { userId: true },
        }),
        this.prisma.clientMembership.findMany({
          where: { location: { orgId: tenantId }, status: ClientMembershipStatus.active },
          select: { plan: { select: { priceCents: true } } },
        }),
      ]);

    const mrrCents = activeMembershipRows.reduce((sum, row) => sum + (row.plan?.priceCents ?? 0), 0);

    return {
      mrrCents,
      activeMemberships,
      newMemberships,
      canceledMemberships,
      bookings,
      cancellations,
      checkins,
      uniqueActiveClients: uniqueClients.length,
    };
  }

  async getLocations(user: User, input: { range: AnalyticsRange; page: number; pageSize: number }): Promise<{ items: Array<{ locationId: string; name: string; bookings: number; checkins: number; activeMemberships: number; utilizationPct: number }>; page: number; pageSize: number; total: number }> {
    const tenantId = this.resolveTenantId(user);
    await this.assertOwnerOrManager(user, tenantId);
    const { start, end } = this.getDateRange(input.range);
    const skip = (input.page - 1) * input.pageSize;

    const [total, locations] = await Promise.all([
      this.prisma.gym.count({ where: { orgId: tenantId } }),
      this.prisma.gym.findMany({ where: { orgId: tenantId }, select: { id: true, name: true }, orderBy: { createdAt: 'asc' }, skip, take: input.pageSize }),
    ]);

    const items = await Promise.all(locations.map(async (location) => {
      const [bookings, checkins, activeMemberships, sessions] = await Promise.all([
        this.prisma.classBooking.count({ where: { locationId: location.id, createdAt: { gte: start, lte: end } } }),
        this.prisma.classBooking.count({ where: { locationId: location.id, status: ClassBookingStatus.CHECKED_IN, updatedAt: { gte: start, lte: end } } }),
        this.prisma.clientMembership.count({ where: { locationId: location.id, status: ClientMembershipStatus.active } }),
        this.prisma.classSession.findMany({
          where: { locationId: location.id, startsAt: { gte: start, lte: end }, status: 'SCHEDULED' },
          select: {
            capacityOverride: true,
            classTemplate: { select: { capacity: true } },
            _count: { select: { bookings: { where: { status: { in: [ClassBookingStatus.BOOKED, ClassBookingStatus.CHECKED_IN] } } } } },
          },
        }),
      ]);

      const totals = sessions.reduce(
        (acc, session) => {
          const capacity = session.capacityOverride ?? session.classTemplate.capacity;
          return {
            booked: acc.booked + session._count.bookings,
            capacity: acc.capacity + Math.max(capacity, 0),
          };
        },
        { booked: 0, capacity: 0 },
      );

      return {
        locationId: location.id,
        name: location.name,
        bookings,
        checkins,
        activeMemberships,
        utilizationPct: totals.capacity > 0 ? Math.round((totals.booked / totals.capacity) * 100) : 0,
      };
    }));

    return { items, page: input.page, pageSize: input.pageSize, total };
  }

  async getTrends(user: User, input: { metric: AnalyticsTrendMetric; range: '30d' }): Promise<Array<{ date: string; value: number }>> {
    const tenantId = this.resolveTenantId(user);
    await this.assertOwnerOrManager(user, tenantId);
    const { start, days } = this.getDateRange(input.range);
    const points = new Map<string, number>();

    if (input.metric === 'bookings') {
      const grouped = await this.prisma.classBooking.groupBy({
        by: ['createdAt'],
        where: { location: { orgId: tenantId }, createdAt: { gte: start } },
        _count: { _all: true },
      });
      for (const row of grouped) {
        const key = this.toDateKey(row.createdAt);
        points.set(key, (points.get(key) ?? 0) + row._count._all);
      }
    } else if (input.metric === 'checkins') {
      const grouped = await this.prisma.classBooking.groupBy({
        by: ['updatedAt'],
        where: { location: { orgId: tenantId }, status: ClassBookingStatus.CHECKED_IN, updatedAt: { gte: start } },
        _count: { _all: true },
      });
      for (const row of grouped) {
        const key = this.toDateKey(row.updatedAt);
        points.set(key, (points.get(key) ?? 0) + row._count._all);
      }
    } else {
      const grouped = await this.prisma.clientMembership.groupBy({
        by: ['createdAt'],
        where: { location: { orgId: tenantId }, createdAt: { gte: start } },
        _count: { _all: true },
      });
      for (const row of grouped) {
        const key = this.toDateKey(row.createdAt);
        points.set(key, (points.get(key) ?? 0) + row._count._all);
      }
    }

    const series: Array<{ date: string; value: number }> = [];
    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      date.setHours(0, 0, 0, 0);
      const key = this.toDateKey(date);
      series.push({ date: key, value: points.get(key) ?? 0 });
    }

    return series;
  }

  async getTopClassesAnalytics(user: User, input: { range: AnalyticsRange; page: number; pageSize: number }): Promise<{ items: Array<{ classId: string; title: string; sessionsCount: number; bookingsCount: number; avgUtilizationPct: number }>; page: number; pageSize: number; total: number }> {
    const tenantId = this.resolveTenantId(user);
    await this.assertOwnerOrManager(user, tenantId);
    const { start, end } = this.getDateRange(input.range);

    const sessions = await this.prisma.classSession.findMany({
      where: { location: { orgId: tenantId }, startsAt: { gte: start, lte: end }, status: 'SCHEDULED' },
      select: {
        classId: true,
        capacityOverride: true,
        classTemplate: { select: { id: true, title: true, capacity: true } },
        _count: { select: { bookings: { where: { status: { in: [ClassBookingStatus.BOOKED, ClassBookingStatus.CHECKED_IN] } } } } },
      },
    });

    const aggregation = new Map<string, { classId: string; title: string; sessionsCount: number; bookingsCount: number; utilizationTotal: number }>();
    for (const session of sessions) {
      const existing = aggregation.get(session.classId) ?? {
        classId: session.classTemplate.id,
        title: session.classTemplate.title,
        sessionsCount: 0,
        bookingsCount: 0,
        utilizationTotal: 0,
      };
      const capacity = session.capacityOverride ?? session.classTemplate.capacity;
      const utilization = capacity > 0 ? session._count.bookings / capacity : 0;

      existing.sessionsCount += 1;
      existing.bookingsCount += session._count.bookings;
      existing.utilizationTotal += utilization;
      aggregation.set(session.classId, existing);
    }

    const sorted = [...aggregation.values()].sort((a, b) => b.bookingsCount - a.bookingsCount);
    const paged = sorted.slice((input.page - 1) * input.pageSize, input.page * input.pageSize);

    return {
      items: paged.map((item) => ({
        classId: item.classId,
        title: item.title,
        sessionsCount: item.sessionsCount,
        bookingsCount: item.bookingsCount,
        avgUtilizationPct: item.sessionsCount > 0 ? Math.round((item.utilizationTotal / item.sessionsCount) * 100) : 0,
      })),
      page: input.page,
      pageSize: input.pageSize,
      total: sorted.length,
    };
  }

  private aiEnabled(): boolean {
    return process.env.AI_ANALYTICS_ENABLED === 'true';
  }

  async recomputeDailyMetrics(runDate?: string): Promise<{ date: string; locationsProcessed: number }> {
    const date = runDate ?? new Date().toISOString().slice(0, 10);
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);

    const locations = await this.prisma.gym.findMany({ select: { id: true, orgId: true } });

    for (const location of locations) {
      const [bookingsCount, canceledBookingsCount, checkinsCount, uniqueClientsCount, newClientsCount, activeMemberships, canceledMemberships, newMemberships] = await Promise.all([
        this.prisma.classBooking.count({ where: { locationId: location.id, createdAt: { gte: start, lte: end } } }),
        this.prisma.classBooking.count({ where: { locationId: location.id, status: 'CANCELED', updatedAt: { gte: start, lte: end } } }),
        this.prisma.classBooking.count({ where: { locationId: location.id, status: 'CHECKED_IN', updatedAt: { gte: start, lte: end } } }),
        this.prisma.classBooking.findMany({
          where: { locationId: location.id, createdAt: { gte: start, lte: end } },
          distinct: ['userId'],
          select: { userId: true },
        }).then((items) => items.length),
        this.prisma.membership.count({ where: { orgId: location.orgId, gymId: location.id, role: MembershipRole.CLIENT, createdAt: { gte: start, lte: end } } }),
        this.prisma.clientMembership.count({ where: { locationId: location.id, status: 'active' } }),
        this.prisma.clientMembership.count({ where: { locationId: location.id, canceledAt: { gte: start, lte: end } } }),
        this.prisma.clientMembership.count({ where: { locationId: location.id, createdAt: { gte: start, lte: end } } }),
      ]);

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "DailyLocationMetrics" ("id","tenantId","locationId","date","checkinsCount","bookingsCount","uniqueClientsCount","newClientsCount","canceledBookingsCount","createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3::date, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT ("locationId","date") DO UPDATE SET
          "checkinsCount"=EXCLUDED."checkinsCount",
          "bookingsCount"=EXCLUDED."bookingsCount",
          "uniqueClientsCount"=EXCLUDED."uniqueClientsCount",
          "newClientsCount"=EXCLUDED."newClientsCount",
          "canceledBookingsCount"=EXCLUDED."canceledBookingsCount"`,
        location.orgId,
        location.id,
        date,
        checkinsCount,
        bookingsCount,
        uniqueClientsCount,
        newClientsCount,
        canceledBookingsCount,
      );

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "DailyMembershipMetrics" ("id","tenantId","locationId","date","activeMemberships","canceledMemberships","newMemberships","createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3::date, $4, $5, $6, NOW())
         ON CONFLICT ("locationId","date") DO UPDATE SET
          "activeMemberships"=EXCLUDED."activeMemberships",
          "canceledMemberships"=EXCLUDED."canceledMemberships",
          "newMemberships"=EXCLUDED."newMemberships"`,
        location.orgId,
        location.id,
        date,
        activeMemberships,
        canceledMemberships,
        newMemberships,
      );
    }

    return { date, locationsProcessed: locations.length };
  }

  async generateInsights(user: User, locationId?: string): Promise<InsightResponse[]> {
    const tenantId = this.resolveTenantId(user);
    await this.assertOwnerOrAdmin(user, tenantId);

    const locationFilter = locationId ? `AND dlm."locationId" = '${locationId}'` : '';
    const rows = await this.prisma.$queryRawUnsafe<DbRow[]>(
      `SELECT dlm."locationId", dlm."date", dlm."checkinsCount", dlm."bookingsCount", dlm."canceledBookingsCount", dmm."canceledMemberships"
       FROM "DailyLocationMetrics" dlm
       LEFT JOIN "DailyMembershipMetrics" dmm
         ON dmm."locationId" = dlm."locationId" AND dmm."date" = dlm."date"
       WHERE dlm."tenantId" = $1 ${locationFilter}
       ORDER BY dlm."date" DESC
       LIMIT 30`,
      tenantId,
    );

    const insights: InsightResponse[] = [];
    const nowIso = new Date().toISOString();
    const latest14 = rows.slice(0, 14);
    if (latest14.length >= 14) {
      const thisWeek = latest14.slice(0, 7).reduce((sum, item) => sum + Number(item.checkinsCount ?? 0), 0);
      const prevWeek = latest14.slice(7, 14).reduce((sum, item) => sum + Number(item.checkinsCount ?? 0), 0);
      const deltaPct = prevWeek > 0 ? ((thisWeek - prevWeek) / prevWeek) * 100 : 0;
      if (deltaPct <= -20) {
        insights.push({
          id: `attendance-drop-${Date.now()}`,
          severity: 'critical',
          title: 'Attendance dropped sharply',
          summary: `Check-ins are down ${Math.abs(Math.round(deltaPct))}% versus the previous 7 days.`,
          recommendedActions: ['Promote under-attended classes', 'Send re-engagement campaign to inactive members'],
          metricRefs: ['DailyLocationMetrics.checkinsCount.rolling7d'],
          createdAt: nowIso,
          locationId: locationId ?? null,
        });
      }

      const cancellationNow = latest14.slice(0, 7).reduce((sum, item) => sum + Number(item.canceledBookingsCount ?? 0), 0);
      const cancellationPrev = latest14.slice(7, 14).reduce((sum, item) => sum + Number(item.canceledBookingsCount ?? 0), 0);
      if (cancellationNow > cancellationPrev * 1.3 && cancellationNow >= 5) {
        insights.push({
          id: `cancellation-spike-${Date.now()}`,
          severity: 'warning',
          title: 'Booking cancellations are rising',
          summary: `Cancellations rose from ${cancellationPrev} to ${cancellationNow} week-over-week.`,
          recommendedActions: ['Review class schedules', 'Audit coach assignment consistency'],
          metricRefs: ['DailyLocationMetrics.canceledBookingsCount.rolling7d'],
          createdAt: nowIso,
          locationId: locationId ?? null,
        });
      }

      const churnNow = latest14.slice(0, 7).reduce((sum, item) => sum + Number(item.canceledMemberships ?? 0), 0);
      const churnPrev = latest14.slice(7, 14).reduce((sum, item) => sum + Number(item.canceledMemberships ?? 0), 0);
      if (churnNow > churnPrev * 1.2 && churnNow >= 3) {
        insights.push({
          id: `churn-risk-${Date.now()}`,
          severity: 'warning',
          title: 'Churn risk signal detected',
          summary: `Membership cancellations increased to ${churnNow} in the last 7 days.`,
          recommendedActions: ['Introduce retention offers', 'Trigger win-back outreach for at-risk clients'],
          metricRefs: ['DailyMembershipMetrics.canceledMemberships.rolling7d'],
          createdAt: nowIso,
          locationId: locationId ?? null,
        });
      }
    }

    const utilizationRows = await this.prisma.classSession.findMany({
      where: { locationId: locationId, status: 'SCHEDULED' },
      include: {
        classTemplate: { select: { title: true, capacity: true } },
        _count: { select: { bookings: { where: { status: { in: ['BOOKED', 'CHECKED_IN'] } } } } },
      },
      take: 25,
      orderBy: { startsAt: 'desc' },
    });

    const lowUtilized = utilizationRows.filter((session) => {
      const capacity = session.capacityOverride ?? session.classTemplate.capacity;
      if (capacity <= 0) return false;
      return session._count.bookings / capacity < 0.4;
    }).length;

    if (lowUtilized >= 5) {
      insights.push({
        id: `low-utilization-${Date.now()}`,
        severity: 'info',
        title: 'Low utilization classes detected',
        summary: `${lowUtilized} recent class sessions were below 40% capacity.`,
        recommendedActions: ['Consolidate low-demand timeslots', 'Offer limited-time promotions for quieter classes'],
        metricRefs: ['ClassSession.utilizationRate'],
        createdAt: nowIso,
        locationId: locationId ?? null,
      });
    }

    for (const insight of insights) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "InsightLog" ("id","tenantId","locationId","insightType","payload","createdAt") VALUES (gen_random_uuid(), $1, $2, $3, $4::jsonb, NOW())`,
        tenantId,
        insight.locationId,
        insight.id,
        JSON.stringify({
          severity: insight.severity,
          title: insight.title,
          summary: insight.summary,
          recommendedActions: insight.recommendedActions,
          metricRefs: insight.metricRefs,
        }),
      );
    }

    return insights;
  }

  async listInsightHistory(user: User, locationId?: string): Promise<InsightResponse[]> {
    const tenantId = this.resolveTenantId(user);
    await this.assertOwnerOrAdmin(user, tenantId);
    const rows = await this.prisma.$queryRawUnsafe<DbRow[]>(
      `SELECT "id", "locationId", "payload", "createdAt"
       FROM "InsightLog"
       WHERE "tenantId" = $1 AND ($2::text IS NULL OR "locationId" = $2::text)
       ORDER BY "createdAt" DESC LIMIT 100`,
      tenantId,
      locationId ?? null,
    );

    return rows.map((row) => {
      const payload = typeof row.payload === 'object' && row.payload !== null ? (row.payload as Record<string, unknown>) : {};
      return {
        id: String(row.id),
        severity: (payload.severity as InsightSeverity) ?? 'info',
        title: String(payload.title ?? 'Insight'),
        summary: String(payload.summary ?? ''),
        recommendedActions: Array.isArray(payload.recommendedActions) ? payload.recommendedActions.map((action) => String(action)) : [],
        metricRefs: Array.isArray(payload.metricRefs) ? payload.metricRefs.map((ref) => String(ref)) : [],
        createdAt: new Date(String(row.createdAt)).toISOString(),
        locationId: row.locationId ? String(row.locationId) : null,
      };
    });
  }

  async ask(user: User, body: AskAiDto): Promise<AskResponse> {
    if (!this.aiEnabled()) {
      throw new ForbiddenException('AI analytics is disabled');
    }

    const tenantId = this.resolveTenantId(user);
    await this.assertOwnerOrAdmin(user, tenantId);

    const question = body.question.toLowerCase();

    if (question.includes('attendance')) {
      const rows = await this.getAttendanceTrend(tenantId, body.scope === AskScope.LOCATION ? body.locationId : undefined);
      return {
        answer: `Attendance trend is based on pre-aggregated daily check-ins. Total for selected range: ${rows.reduce((sum, row) => sum + row.value, 0)}.`,
        data: { series: rows },
        citations: ['DailyLocationMetrics.checkinsCount'],
      };
    }

    if (question.includes('popular') || question.includes('top classes')) {
      const rows = await this.getTopClasses(tenantId, body.scope === AskScope.LOCATION ? body.locationId : undefined);
      return {
        answer: 'These are the most booked classes in the selected scope.',
        data: { classes: rows },
        citations: ['ClassBooking.count by class'],
      };
    }

    if (question.includes('cancellation') || question.includes('churn')) {
      const rows = await this.getMembershipChanges(tenantId, body.scope === AskScope.LOCATION ? body.locationId : undefined);
      return {
        answer: `Membership changes show ${rows.newMemberships} new and ${rows.canceledMemberships} canceled memberships over the last 30 days.`,
        data: rows,
        citations: ['DailyMembershipMetrics.newMemberships', 'DailyMembershipMetrics.canceledMemberships'],
      };
    }

    const noShowRate = await this.getNoShowRate(tenantId, body.scope === AskScope.LOCATION ? body.locationId : undefined);
    return {
      answer: `No-show rate is ${Math.round(noShowRate.rate * 100)}% for the selected scope and period.`,
      data: noShowRate,
      citations: ['ClassBooking BOOKED vs CHECKED_IN'],
    };
  }

  private async getAttendanceTrend(tenantId: string, locationId?: string): Promise<Array<{ date: string; value: number }>> {
    const rows = await this.prisma.$queryRawUnsafe<DbRow[]>(
      `SELECT "date", SUM("checkinsCount")::int AS value
       FROM "DailyLocationMetrics"
       WHERE "tenantId" = $1 AND ($2::text IS NULL OR "locationId" = $2::text)
       GROUP BY "date"
       ORDER BY "date" DESC
       LIMIT 30`,
      tenantId,
      locationId ?? null,
    );

    return rows.map((row) => ({ date: String(row.date), value: Number(row.value ?? 0) })).reverse();
  }

  private async getTopClasses(tenantId: string, locationId?: string): Promise<Array<{ classTitle: string; bookings: number }>> {
    const sessionRows = await this.prisma.classBooking.groupBy({
      by: ['sessionId'],
      where: {
        location: { orgId: tenantId },
        locationId,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      _count: { sessionId: true },
      orderBy: { _count: { sessionId: 'desc' } },
    });

    const sessions = await this.prisma.classSession.findMany({
      where: { id: { in: sessionRows.map((row) => row.sessionId) } },
      select: { id: true, classId: true },
    });
    const sessionToClassId = new Map(sessions.map((session) => [session.id, session.classId]));

    const bookingsByClass = new Map<string, number>();
    for (const row of sessionRows) {
      const classId = sessionToClassId.get(row.sessionId);
      if (!classId) continue;
      bookingsByClass.set(classId, (bookingsByClass.get(classId) ?? 0) + row._count.sessionId);
    }

    const topClasses = [...bookingsByClass.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const classes = await this.prisma.class.findMany({
      where: { id: { in: topClasses.map(([classId]) => classId) } },
      select: { id: true, title: true },
    });
    const classTitles = new Map(classes.map((cls) => [cls.id, cls.title]));

    return topClasses.map(([classId, bookings]) => ({ classTitle: classTitles.get(classId) ?? 'Unknown class', bookings }));
  }

  private async getMembershipChanges(tenantId: string, locationId?: string): Promise<{ newMemberships: number; canceledMemberships: number }> {
    const rows = await this.prisma.$queryRawUnsafe<DbRow[]>(
      `SELECT COALESCE(SUM("newMemberships"),0)::int AS "newMemberships", COALESCE(SUM("canceledMemberships"),0)::int AS "canceledMemberships"
       FROM "DailyMembershipMetrics"
       WHERE "tenantId" = $1 AND ($2::text IS NULL OR "locationId" = $2::text)
       AND "date" >= CURRENT_DATE - INTERVAL '30 day'`,
      tenantId,
      locationId ?? null,
    );

    return {
      newMemberships: Number(rows[0]?.newMemberships ?? 0),
      canceledMemberships: Number(rows[0]?.canceledMemberships ?? 0),
    };
  }

  private async getNoShowRate(tenantId: string, locationId?: string): Promise<{ booked: number; checkedIn: number; rate: number }> {
    const [booked, checkedIn] = await Promise.all([
      this.prisma.classBooking.count({ where: { location: { orgId: tenantId }, locationId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
      this.prisma.classBooking.count({ where: { location: { orgId: tenantId }, locationId, status: 'CHECKED_IN', createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
    ]);

    const rate = booked > 0 ? (booked - checkedIn) / booked : 0;
    return { booked, checkedIn, rate };
  }
}
