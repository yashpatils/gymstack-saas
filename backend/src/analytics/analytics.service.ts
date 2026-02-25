import { BadRequestException, ForbiddenException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ClassBookingStatus, ClientMembershipStatus, MembershipRole, MembershipStatus, Prisma } from '@prisma/client';
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
export class AnalyticsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsService.name);
  private cronTimer: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    this.scheduleNextDailyRollup();
  }

  onModuleDestroy(): void {
    if (this.cronTimer) {
      clearInterval(this.cronTimer);
      this.cronTimer = null;
    }
  }

  private scheduleNextDailyRollup(): void {
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(3, 0, 0, 0);
    if (next <= now) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    const delayMs = next.getTime() - now.getTime();

    this.cronTimer = setTimeout(async () => {
      try {
        await this.handleDailyMetricsCron();
      } finally {
        this.scheduleNextDailyRollup();
      }
    }, delayMs);
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

  private normalizeLocationId(locationId?: string): string | null {
    if (!locationId) return null;
    const trimmed = locationId.trim();
    if (!trimmed) return null;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)) {
      throw new BadRequestException('Invalid locationId');
    }
    return trimmed;
  }

  private parseIsoDate(date: string, field: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException(`${field} must be in YYYY-MM-DD format`);
    }
    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
      throw new BadRequestException(`${field} must be a valid date`);
    }
    return date;
  }

  private enumerateDateRange(from: string, to: string): string[] {
    const parsedFrom = new Date(`${from}T00:00:00.000Z`);
    const parsedTo = new Date(`${to}T00:00:00.000Z`);
    if (parsedFrom > parsedTo) {
      throw new BadRequestException('from must be before or equal to to');
    }

    const dates: string[] = [];
    const cursor = new Date(parsedFrom);
    while (cursor <= parsedTo) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return dates;
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

  private async recomputeDailyMetricsForDate(date: string, gymId?: string): Promise<number> {
    const locationScope = gymId
      ? Prisma.sql`WHERE g."id" = ${gymId}`
      : Prisma.empty;

    const locationsProcessed = await this.prisma.$executeRaw(Prisma.sql`
      WITH gym_scope AS (
        SELECT g."id", g."orgId", g."timezone"
        FROM "Gym" g
        ${locationScope}
      ),
      location_rollup AS (
        SELECT
          gs."orgId" AS "tenantId",
          gs."id" AS "locationId",
          ${date}::date AS "date",
          (
            SELECT COUNT(*)::int
            FROM "ClassBooking" cb
            WHERE cb."locationId" = gs."id"
              AND (cb."createdAt" AT TIME ZONE gs."timezone")::date = ${date}::date
          ) AS "bookingsCount",
          (
            SELECT COUNT(*)::int
            FROM "ClassBooking" cb
            WHERE cb."locationId" = gs."id"
              AND cb."status" = 'CANCELED'
              AND (cb."updatedAt" AT TIME ZONE gs."timezone")::date = ${date}::date
          ) AS "canceledBookingsCount",
          (
            SELECT COUNT(*)::int
            FROM "ClassBooking" cb
            WHERE cb."locationId" = gs."id"
              AND cb."status" = 'CHECKED_IN'
              AND (cb."updatedAt" AT TIME ZONE gs."timezone")::date = ${date}::date
          ) AS "checkinsCount",
          (
            SELECT COUNT(DISTINCT cb."userId")::int
            FROM "ClassBooking" cb
            WHERE cb."locationId" = gs."id"
              AND (cb."createdAt" AT TIME ZONE gs."timezone")::date = ${date}::date
          ) AS "uniqueClientsCount",
          (
            SELECT COUNT(*)::int
            FROM "Membership" m
            WHERE m."gymId" = gs."id"
              AND m."orgId" = gs."orgId"
              AND m."role" = 'CLIENT'
              AND (m."createdAt" AT TIME ZONE gs."timezone")::date = ${date}::date
          ) AS "newClientsCount"
        FROM gym_scope gs
      ),
      membership_rollup AS (
        SELECT
          gs."orgId" AS "tenantId",
          gs."id" AS "locationId",
          ${date}::date AS "date",
          (
            SELECT COUNT(*)::int
            FROM "ClientMembership" cm
            WHERE cm."locationId" = gs."id"
              AND cm."startAt" IS NOT NULL
              AND (cm."startAt" AT TIME ZONE gs."timezone")::date <= ${date}::date
              AND (
                COALESCE(cm."canceledAt", cm."endAt") IS NULL
                OR (COALESCE(cm."canceledAt", cm."endAt") AT TIME ZONE gs."timezone")::date > ${date}::date
              )
          ) AS "activeMemberships",
          (
            SELECT COUNT(*)::int
            FROM "ClientMembership" cm
            WHERE cm."locationId" = gs."id"
              AND cm."canceledAt" IS NOT NULL
              AND (cm."canceledAt" AT TIME ZONE gs."timezone")::date = ${date}::date
          ) AS "canceledMemberships",
          (
            SELECT COUNT(*)::int
            FROM "ClientMembership" cm
            WHERE cm."locationId" = gs."id"
              AND (cm."createdAt" AT TIME ZONE gs."timezone")::date = ${date}::date
          ) AS "newMemberships"
        FROM gym_scope gs
      ),
      upsert_location AS (
        INSERT INTO "DailyLocationMetrics" ("id","tenantId","locationId","date","checkinsCount","bookingsCount","uniqueClientsCount","newClientsCount","canceledBookingsCount","createdAt")
        SELECT gen_random_uuid(), "tenantId", "locationId", "date", "checkinsCount", "bookingsCount", "uniqueClientsCount", "newClientsCount", "canceledBookingsCount", NOW()
        FROM location_rollup
        ON CONFLICT ("locationId","date") DO UPDATE SET
          "tenantId"=EXCLUDED."tenantId",
          "checkinsCount"=EXCLUDED."checkinsCount",
          "bookingsCount"=EXCLUDED."bookingsCount",
          "uniqueClientsCount"=EXCLUDED."uniqueClientsCount",
          "newClientsCount"=EXCLUDED."newClientsCount",
          "canceledBookingsCount"=EXCLUDED."canceledBookingsCount"
      )
      INSERT INTO "DailyMembershipMetrics" ("id","tenantId","locationId","date","activeMemberships","canceledMemberships","newMemberships","createdAt")
      SELECT gen_random_uuid(), "tenantId", "locationId", "date", "activeMemberships", "canceledMemberships", "newMemberships", NOW()
      FROM membership_rollup
      ON CONFLICT ("locationId","date") DO UPDATE SET
        "tenantId"=EXCLUDED."tenantId",
        "activeMemberships"=EXCLUDED."activeMemberships",
        "canceledMemberships"=EXCLUDED."canceledMemberships",
        "newMemberships"=EXCLUDED."newMemberships"
    `);

    return Number(locationsProcessed);
  }

  async backfillDailyMetrics(input: { from: string; to: string; gymId?: string | null }): Promise<{ from: string; to: string; daysProcessed: number; locationsProcessed: number }> {
    const from = this.parseIsoDate(input.from, 'from');
    const to = this.parseIsoDate(input.to, 'to');
    const gymId = input.gymId ? this.normalizeLocationId(input.gymId) : null;
    const dates = this.enumerateDateRange(from, to);

    let locationsProcessed = 0;
    for (const date of dates) {
      locationsProcessed += await this.recomputeDailyMetricsForDate(date, gymId ?? undefined);
    }

    return { from, to, daysProcessed: dates.length, locationsProcessed };
  }

  async recomputeDailyMetrics(runDate?: string): Promise<{ date: string; locationsProcessed: number }> {
    const date = runDate ? this.parseIsoDate(runDate, 'date') : new Date().toISOString().slice(0, 10);
    const locationsProcessed = await this.recomputeDailyMetricsForDate(date);
    return { date, locationsProcessed };
  }

  async handleDailyMetricsCron(): Promise<void> {
    const today = new Date();
    const to = today.toISOString().slice(0, 10);
    const fromDate = new Date(today);
    fromDate.setUTCDate(fromDate.getUTCDate() - 1);
    const from = fromDate.toISOString().slice(0, 10);

    const result = await this.backfillDailyMetrics({ from, to });
    this.logger.log(`Daily metrics rollup complete: ${result.locationsProcessed} rows processed across ${result.daysProcessed} day(s)`);
  }

  async getGymMetrics(user: User, gymId: string, input: { from: string; to: string }): Promise<{
    gymId: string;
    from: string;
    to: string;
    kpis: {
      bookings: number;
      checkins: number;
      newClients: number;
      churnedMemberships: number;
      newMemberships: number;
      latestActiveMemberships: number;
    };
    daily: Array<{
      date: string;
      bookings: number;
      checkins: number;
      uniqueClients: number;
      newClients: number;
      canceledBookings: number;
      activeMemberships: number;
      canceledMemberships: number;
      newMemberships: number;
    }>;
  }> {
    const tenantId = this.resolveTenantId(user);
    await this.assertOwnerOrManager(user, tenantId);
    const normalizedGymId = this.normalizeLocationId(gymId);
    if (!normalizedGymId) {
      throw new BadRequestException('Invalid gymId');
    }
    const from = this.parseIsoDate(input.from, 'from');
    const to = this.parseIsoDate(input.to, 'to');

    const gym = await this.prisma.gym.findFirst({ where: { id: normalizedGymId, orgId: tenantId }, select: { id: true } });
    if (!gym) {
      throw new ForbiddenException('Gym not found in tenant');
    }

    const rows = await this.prisma.$queryRaw<Array<{
      date: Date;
      bookingsCount: number;
      checkinsCount: number;
      uniqueClientsCount: number;
      newClientsCount: number;
      canceledBookingsCount: number;
      activeMemberships: number;
      canceledMemberships: number;
      newMemberships: number;
    }>>(Prisma.sql`
      SELECT
        dlm."date",
        dlm."bookingsCount",
        dlm."checkinsCount",
        dlm."uniqueClientsCount",
        dlm."newClientsCount",
        dlm."canceledBookingsCount",
        COALESCE(dmm."activeMemberships", 0) AS "activeMemberships",
        COALESCE(dmm."canceledMemberships", 0) AS "canceledMemberships",
        COALESCE(dmm."newMemberships", 0) AS "newMemberships"
      FROM "DailyLocationMetrics" dlm
      LEFT JOIN "DailyMembershipMetrics" dmm
        ON dmm."locationId" = dlm."locationId"
       AND dmm."date" = dlm."date"
      WHERE dlm."locationId" = ${normalizedGymId}
        AND dlm."tenantId" = ${tenantId}
        AND dlm."date" >= ${from}::date
        AND dlm."date" <= ${to}::date
      ORDER BY dlm."date" ASC
    `);

    const daily = rows.map((row) => ({
      date: this.toDateKey(new Date(row.date)),
      bookings: Number(row.bookingsCount ?? 0),
      checkins: Number(row.checkinsCount ?? 0),
      uniqueClients: Number(row.uniqueClientsCount ?? 0),
      newClients: Number(row.newClientsCount ?? 0),
      canceledBookings: Number(row.canceledBookingsCount ?? 0),
      activeMemberships: Number(row.activeMemberships ?? 0),
      canceledMemberships: Number(row.canceledMemberships ?? 0),
      newMemberships: Number(row.newMemberships ?? 0),
    }));

    return {
      gymId: normalizedGymId,
      from,
      to,
      kpis: {
        bookings: daily.reduce((sum, row) => sum + row.bookings, 0),
        checkins: daily.reduce((sum, row) => sum + row.checkins, 0),
        newClients: daily.reduce((sum, row) => sum + row.newClients, 0),
        churnedMemberships: daily.reduce((sum, row) => sum + row.canceledMemberships, 0),
        newMemberships: daily.reduce((sum, row) => sum + row.newMemberships, 0),
        latestActiveMemberships: daily.length > 0 ? daily[daily.length - 1].activeMemberships : 0,
      },
      daily,
    };
  }

  async generateInsights(user: User, locationId?: string): Promise<InsightResponse[]> {
    const tenantId = this.resolveTenantId(user);
    await this.assertOwnerOrAdmin(user, tenantId);

    const normalizedLocationId = this.normalizeLocationId(locationId);
    const rows = await this.prisma.$queryRaw<DbRow[]>(Prisma.sql`
      SELECT dlm."locationId", dlm."date", dlm."checkinsCount", dlm."bookingsCount", dlm."canceledBookingsCount", dmm."canceledMemberships"
       FROM "DailyLocationMetrics" dlm
       LEFT JOIN "DailyMembershipMetrics" dmm
         ON dmm."locationId" = dlm."locationId" AND dmm."date" = dlm."date"
       WHERE dlm."tenantId" = ${tenantId}
         AND (${normalizedLocationId}::text IS NULL OR dlm."locationId" = ${normalizedLocationId}::text)
       ORDER BY dlm."date" DESC
       LIMIT 30
    `);

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
      where: { locationId: normalizedLocationId ?? undefined, status: 'SCHEDULED' },
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
      await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO "InsightLog" ("id","tenantId","locationId","insightType","payload","createdAt")
        VALUES (gen_random_uuid(), ${tenantId}, ${insight.locationId}, ${insight.id}, ${JSON.stringify({
          severity: insight.severity,
          title: insight.title,
          summary: insight.summary,
          recommendedActions: insight.recommendedActions,
          metricRefs: insight.metricRefs,
        })}::jsonb, NOW())
      `);
    }

    return insights;
  }

  async listInsightHistory(user: User, locationId?: string): Promise<InsightResponse[]> {
    const tenantId = this.resolveTenantId(user);
    await this.assertOwnerOrAdmin(user, tenantId);
    const rows = await this.prisma.$queryRaw<DbRow[]>(Prisma.sql`
      SELECT "id", "locationId", "payload", "createdAt"
       FROM "InsightLog"
       WHERE "tenantId" = ${tenantId} AND (${locationId ?? null}::text IS NULL OR "locationId" = ${locationId ?? null}::text)
       ORDER BY "createdAt" DESC LIMIT 100
    `);

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
      const rows = await this.getAttendanceTrend(tenantId, body.scope === AskScope.LOCATION ? this.normalizeLocationId(body.locationId) ?? undefined : undefined);
      return {
        answer: `Attendance trend is based on pre-aggregated daily check-ins. Total for selected range: ${rows.reduce((sum, row) => sum + row.value, 0)}.`,
        data: { series: rows },
        citations: ['DailyLocationMetrics.checkinsCount'],
      };
    }

    if (question.includes('popular') || question.includes('top classes')) {
      const rows = await this.getTopClasses(tenantId, body.scope === AskScope.LOCATION ? this.normalizeLocationId(body.locationId) ?? undefined : undefined);
      return {
        answer: 'These are the most booked classes in the selected scope.',
        data: { classes: rows },
        citations: ['ClassBooking.count by class'],
      };
    }

    if (question.includes('cancellation') || question.includes('churn')) {
      const rows = await this.getMembershipChanges(tenantId, body.scope === AskScope.LOCATION ? this.normalizeLocationId(body.locationId) ?? undefined : undefined);
      return {
        answer: `Membership changes show ${rows.newMemberships} new and ${rows.canceledMemberships} canceled memberships over the last 30 days.`,
        data: rows,
        citations: ['DailyMembershipMetrics.newMemberships', 'DailyMembershipMetrics.canceledMemberships'],
      };
    }

    const noShowRate = await this.getNoShowRate(tenantId, body.scope === AskScope.LOCATION ? this.normalizeLocationId(body.locationId) ?? undefined : undefined);
    return {
      answer: `No-show rate is ${Math.round(noShowRate.rate * 100)}% for the selected scope and period.`,
      data: noShowRate,
      citations: ['ClassBooking BOOKED vs CHECKED_IN'],
    };
  }

  private async getAttendanceTrend(tenantId: string, locationId?: string): Promise<Array<{ date: string; value: number }>> {
    const rows = await this.prisma.$queryRaw<DbRow[]>(Prisma.sql`
      SELECT "date", SUM("checkinsCount")::int AS value
       FROM "DailyLocationMetrics"
       WHERE "tenantId" = ${tenantId} AND (${locationId ?? null}::text IS NULL OR "locationId" = ${locationId ?? null}::text)
       GROUP BY "date"
       ORDER BY "date" DESC
       LIMIT 30
    `);

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
    const rows = await this.prisma.$queryRaw<DbRow[]>(Prisma.sql`
      SELECT COALESCE(SUM("newMemberships"),0)::int AS "newMemberships", COALESCE(SUM("canceledMemberships"),0)::int AS "canceledMemberships"
       FROM "DailyMembershipMetrics"
       WHERE "tenantId" = ${tenantId} AND (${locationId ?? null}::text IS NULL OR "locationId" = ${locationId ?? null}::text)
       AND "date" >= CURRENT_DATE - INTERVAL '30 day'
    `);

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
