import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ClassBookingStatus, ClassSessionStatus, MembershipRole, MembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '../users/user.model';

type BriefRange = '7d';

type WeeklyBriefData = {
  attendanceChangePct: number;
  inactiveMembers: number;
  topClass: string | null;
  overbookedClasses: string[];
  planUsage: {
    staffSeatsUsed: number;
    staffSeatLimit: number | null;
    seatUsagePct: number | null;
    locationsUsed: number;
    locationLimit: number | null;
    locationUsagePct: number | null;
  };
  risks: string[];
  opportunities: string[];
};

type AiActionType = 'INVITE_MEMBERS_BACK' | 'CREATE_CLASS_SLOT' | 'UPGRADE_PLAN';

type WeeklyInsightItem = {
  bullet: string;
  actionType: AiActionType | null;
};

type WeeklyBriefContent = {
  generatedAt: string;
  summary: string;
  insights: WeeklyInsightItem[];
  metrics: WeeklyBriefData;
};

@Injectable()
export class AiInsightsService {
  private readonly logger = new Logger(AiInsightsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private buildRunKey(tenantId: string): string {
    return `ai-weekly-brief:${tenantId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  }


  private resolveTenantId(user: User): string {
    const tenantId = user.supportMode?.tenantId ?? user.activeTenantId ?? user.orgId;
    if (!tenantId) {
      throw new ForbiddenException('No tenant context selected');
    }
    return tenantId;
  }

  private async assertOwner(user: User, tenantId: string): Promise<void> {
    if (user.isPlatformAdmin) {
      return;
    }

    const ownerMembership = await this.prisma.membership.findFirst({
      where: {
        orgId: tenantId,
        userId: user.id,
        role: MembershipRole.TENANT_OWNER,
        status: MembershipStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!ownerMembership) {
      throw new ForbiddenException('Only tenant owners can access weekly AI brief');
    }
  }

  async getWeeklyBrief(user: User): Promise<{ cached: boolean; insight: WeeklyBriefContent }> {
    const tenantId = this.resolveTenantId(user);
    await this.assertOwner(user, tenantId);
    return this.getOrGenerateWeeklyBrief(tenantId, '7d');
  }

  async getOrGenerateWeeklyBrief(tenantId: string, range: BriefRange): Promise<{ cached: boolean; insight: WeeklyBriefContent }> {
    let cached: { content: Prisma.JsonValue } | null = null;
    try {
      cached = await this.prisma.aiInsight.findFirst({
        where: {
          tenantId,
          range,
          generatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        orderBy: { generatedAt: 'desc' },
        select: { content: true },
      });
    } catch (error) {
      if (this.isAiInsightTableMissingError(error)) {
        this.logger.warn('AiInsight table is missing; returning non-cached weekly brief fallback payload. Run migrations to enable persistence.');
        return this.buildTableMissingFallback(tenantId);
      }
      throw error;
    }

    if (cached?.content) {
      return { cached: true, insight: cached.content as WeeklyBriefContent };
    }

    try {
      const metrics = await this.collectWeeklyMetrics(tenantId);
      const insight = await this.generateInsightFromMetrics(metrics);

      await this.prisma.$transaction([
        this.prisma.aiInsight.create({
          data: {
            tenantId,
            range,
            content: insight as unknown as Prisma.InputJsonValue,
            generatedAt: new Date(),
          },
        }),
        this.prisma.jobRun.create({
          data: {
            tenantId,
            jobKey: this.buildRunKey(tenantId),
            status: 'success',
          },
        }),
      ]);

      return { cached: false, insight };
    } catch (error) {
      if (this.isAiInsightTableMissingError(error)) {
        this.logger.warn('AiInsight table is missing during persistence; returning non-cached weekly brief fallback payload.');
        return this.buildTableMissingFallback(tenantId);
      }

      const message = error instanceof Error ? error.message : 'weekly brief generation failed';
      await this.prisma.jobRun.create({
        data: {
          tenantId,
          jobKey: this.buildRunKey(tenantId),
          status: 'failed',
          error: message.slice(0, 500),
        },
      });
      throw error;
    }
  }

  private isAiInsightTableMissingError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError
      && error.code === 'P2021'
      && typeof error.message === 'string'
      && error.message.includes('AiInsight');
  }

  private async buildTableMissingFallback(tenantId: string): Promise<{ cached: boolean; insight: WeeklyBriefContent }> {
    const metrics = await this.collectWeeklyMetrics(tenantId);
    const insight = await this.generateInsightFromMetrics(metrics);
    return { cached: false, insight };
  }

  private async collectWeeklyMetrics(tenantId: string): Promise<WeeklyBriefData> {
    const now = new Date();
    const currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - 7);

    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 7);

    const [
      currentAttendance,
      previousAttendance,
      currentBookings,
      previousBookings,
      cancellations,
      inactiveMembers,
      topClassAggregate,
      overbookedSessions,
      staffSeatsUsed,
      locationUsage,
      plan,
      planOverride,
    ] = await Promise.all([
      this.prisma.classBooking.count({ where: { location: { orgId: tenantId }, status: ClassBookingStatus.CHECKED_IN, updatedAt: { gte: currentStart, lte: now } } }),
      this.prisma.classBooking.count({ where: { location: { orgId: tenantId }, status: ClassBookingStatus.CHECKED_IN, updatedAt: { gte: previousStart, lt: currentStart } } }),
      this.prisma.classBooking.count({ where: { location: { orgId: tenantId }, createdAt: { gte: currentStart, lte: now } } }),
      this.prisma.classBooking.count({ where: { location: { orgId: tenantId }, createdAt: { gte: previousStart, lt: currentStart } } }),
      this.prisma.classBooking.count({ where: { location: { orgId: tenantId }, status: ClassBookingStatus.CANCELED, updatedAt: { gte: currentStart, lte: now } } }),
      this.prisma.clientMembership.count({ where: { location: { orgId: tenantId }, status: 'active', user: { classBookings: { none: { createdAt: { gte: currentStart } } } } } }),
      this.prisma.classBooking.groupBy({
        by: ['sessionId'],
        where: { location: { orgId: tenantId }, status: { in: [ClassBookingStatus.BOOKED, ClassBookingStatus.CHECKED_IN] }, createdAt: { gte: currentStart, lte: now } },
        _count: { _all: true },
        orderBy: { _count: { sessionId: 'desc' } },
        take: 1,
      }),
      this.prisma.classSession.findMany({
        where: { location: { orgId: tenantId }, startsAt: { gte: currentStart, lte: now }, status: ClassSessionStatus.SCHEDULED },
        select: {
          classTemplate: { select: { title: true, capacity: true } },
          capacityOverride: true,
          _count: { select: { bookings: { where: { status: { in: [ClassBookingStatus.BOOKED, ClassBookingStatus.CHECKED_IN] } } } } },
        },
      }),
      this.prisma.membership.count({ where: { orgId: tenantId, role: { in: [MembershipRole.TENANT_OWNER, MembershipRole.TENANT_LOCATION_ADMIN, MembershipRole.GYM_STAFF_COACH] }, status: MembershipStatus.ACTIVE } }),
      this.prisma.gym.count({ where: { orgId: tenantId } }),
      this.prisma.planDefinition.findUnique({ where: { key: (await this.prisma.organization.findUniqueOrThrow({ where: { id: tenantId }, select: { planKey: true } })).planKey } }),
      this.prisma.tenantPlanOverride.findUnique({ where: { tenantId } }),
    ]);

    const topClassSessionId = topClassAggregate[0]?.sessionId;
    const topClass = topClassSessionId
      ? (await this.prisma.classSession.findUnique({ where: { id: topClassSessionId }, select: { classTemplate: { select: { title: true } } } }))?.classTemplate.title ?? null
      : null;

    const overbookedClasses = overbookedSessions
      .filter((session) => session._count.bookings > (session.capacityOverride ?? session.classTemplate.capacity))
      .map((session) => session.classTemplate.title)
      .slice(0, 3);

    const attendanceChangePct = previousAttendance > 0
      ? Math.round(((currentAttendance - previousAttendance) / previousAttendance) * 100)
      : currentAttendance > 0
        ? 100
        : 0;

    const bookingDeltaPct = previousBookings > 0
      ? Math.round(((currentBookings - previousBookings) / previousBookings) * 100)
      : 0;

    const staffSeatLimit = planOverride?.maxStaffSeatsOverride ?? plan?.maxStaffSeats ?? null;
    const locationLimit = planOverride?.maxLocationsOverride ?? plan?.maxLocations ?? null;

    const risks: string[] = [];
    const opportunities: string[] = [];

    if (attendanceChangePct <= -15) risks.push(`Attendance is down ${Math.abs(attendanceChangePct)}% week over week.`);
    if (cancellations >= 10) risks.push(`Cancellations reached ${cancellations} in the last 7 days.`);
    if (inactiveMembers >= 15) risks.push(`${inactiveMembers} members have been inactive this week.`);

    if (bookingDeltaPct >= 10) opportunities.push(`Bookings grew by ${bookingDeltaPct}% this week.`);
    if (topClass) opportunities.push(`Promote ${topClass} across more class slots.`);
    if (overbookedClasses.length > 0) opportunities.push(`Add capacity for ${overbookedClasses.join(', ')}.`);

    return {
      attendanceChangePct,
      inactiveMembers,
      topClass,
      overbookedClasses,
      planUsage: {
        staffSeatsUsed,
        staffSeatLimit,
        seatUsagePct: staffSeatLimit && staffSeatLimit > 0 ? Math.round((staffSeatsUsed / staffSeatLimit) * 100) : null,
        locationsUsed: locationUsage,
        locationLimit,
        locationUsagePct: locationLimit && locationLimit > 0 ? Math.round((locationUsage / locationLimit) * 100) : null,
      },
      risks,
      opportunities,
    };
  }

  private async generateInsightFromMetrics(metrics: WeeklyBriefData): Promise<WeeklyBriefContent> {
    const prompt = [
      'You are an operations copilot for gym owners.',
      'Input is aggregate metrics only (no personal data).',
      'Return JSON with shape: {"summary": string, "insights": [{"bullet": string, "actionType": "INVITE_MEMBERS_BACK"|"CREATE_CLASS_SLOT"|"UPGRADE_PLAN"|null}]}',
      'Keep summary under 25 words and insights to max 5 bullets.',
      `Payload: ${JSON.stringify(metrics)}`,
    ].join('\n');

    const llmResult = await this.callLlm(prompt);
    if (llmResult) {
      return {
        generatedAt: new Date().toISOString(),
        summary: llmResult.summary,
        insights: llmResult.insights,
        metrics,
      };
    }

    return {
      generatedAt: new Date().toISOString(),
      summary: 'Weekly operational brief generated from tenant performance trends.',
      insights: this.buildFallbackInsights(metrics),
      metrics,
    };
  }

  private async callLlm(prompt: string): Promise<{ summary: string; insights: WeeklyInsightItem[] } | null> {
    const endpoint = process.env.AI_BRIEF_API_URL;
    if (!endpoint) {
      return null;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.AI_BRIEF_API_KEY ? { Authorization: `Bearer ${process.env.AI_BRIEF_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          model: process.env.AI_BRIEF_MODEL ?? 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Return only valid JSON.' },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        this.logger.warn(`Weekly brief LLM call failed with status ${response.status}`);
        return null;
      }

      const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        return null;
      }

      const parsed = JSON.parse(content) as { summary?: unknown; insights?: unknown };
      const summary = typeof parsed.summary === 'string' ? parsed.summary : '';
      const insights = Array.isArray(parsed.insights)
        ? parsed.insights
          .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const bullet = 'bullet' in item && typeof item.bullet === 'string' ? item.bullet : null;
            const actionType = 'actionType' in item && typeof item.actionType === 'string' ? item.actionType : null;
            if (!bullet) return null;
            return {
              bullet,
              actionType: this.parseActionType(actionType),
            };
          })
          .filter((item): item is WeeklyInsightItem => Boolean(item))
        : [];

      if (!summary || insights.length === 0) {
        return null;
      }

      return { summary, insights };
    } catch (error) {
      this.logger.warn(`Weekly brief LLM call parse failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      return null;
    }
  }

  private parseActionType(value: string | null): AiActionType | null {
    if (!value) return null;
    if (value === 'INVITE_MEMBERS_BACK' || value === 'CREATE_CLASS_SLOT' || value === 'UPGRADE_PLAN') {
      return value;
    }
    return null;
  }

  private buildFallbackInsights(metrics: WeeklyBriefData): WeeklyInsightItem[] {
    const insights: WeeklyInsightItem[] = [];

    if (metrics.inactiveMembers > 0) {
      insights.push({ bullet: `${metrics.inactiveMembers} members were inactive in the last 7 days. Run a win-back campaign.`, actionType: 'INVITE_MEMBERS_BACK' });
    }
    if (metrics.overbookedClasses.length > 0) {
      insights.push({ bullet: `Classes over capacity: ${metrics.overbookedClasses.join(', ')}. Add another slot this week.`, actionType: 'CREATE_CLASS_SLOT' });
    }
    if ((metrics.planUsage.seatUsagePct ?? 0) >= 90 || (metrics.planUsage.locationUsagePct ?? 0) >= 90) {
      insights.push({ bullet: 'Plan limits are nearing capacity. Review upgrade options before growth is blocked.', actionType: 'UPGRADE_PLAN' });
    }
    if (insights.length === 0) {
      insights.push({ bullet: 'Operations are stable this week. Maintain current schedule and continue monitoring attendance trends.', actionType: null });
    }

    return insights.slice(0, 5);
  }

  async getAiUsageForAdmin(): Promise<{ range: '30d'; tenants: Array<{ tenantId: string; tenantName: string; briefsGenerated: number; generationFailures: number }> }> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [tenants, generated, failures] = await Promise.all([
      this.prisma.organization.findMany({ where: { isDemo: false }, select: { id: true, name: true } }),
      this.prisma.aiInsight.groupBy({ by: ['tenantId'], where: { generatedAt: { gte: thirtyDaysAgo } }, _count: { _all: true } }),
      this.prisma.jobRun.groupBy({ by: ['tenantId'], where: { ranAt: { gte: thirtyDaysAgo }, status: 'failed', jobKey: { startsWith: 'ai-weekly-brief:' } }, _count: { _all: true } }),
    ]);

    const generatedCounts = new Map(generated.map((row) => [row.tenantId, row._count._all]));
    const failureCounts = new Map(failures.map((row) => [row.tenantId, row._count._all]));
    return {
      range: '30d',
      tenants: tenants.map((tenant) => ({
        tenantId: tenant.id,
        tenantName: tenant.name,
        briefsGenerated: generatedCounts.get(tenant.id) ?? 0,
        generationFailures: failureCounts.get(tenant.id) ?? 0,
      })),
    };
  }
}
