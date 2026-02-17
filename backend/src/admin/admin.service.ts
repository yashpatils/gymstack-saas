import { Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole, MembershipStatus, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type AdminOverviewResponse = {
  totals: {
    mrrCents: number;
    activeTenants: number;
    activeSubscriptions: number;
    trials: number;
    pastDue: number;
    canceled: number;
  };
  trends: {
    newTenants7d: number;
    newTenants30d: number;
  };
};

type AdminTenantListItem = {
  tenantId: string;
  tenantName: string;
  createdAt: string;
  subscriptionStatus: SubscriptionStatus | 'FREE';
  priceId: string | null;
  mrrCents: number;
  whiteLabelEligible: boolean;
  whiteLabelEnabledEffective: boolean;
  locationsCount: number;
  usersCount: number;
  isDisabled: boolean;
};

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveMrrCents(status: SubscriptionStatus | 'FREE'): number {
    const defaultPlanCents = Number.parseInt(process.env.DEFAULT_TENANT_MRR_CENTS ?? '9900', 10);
    const planCents = Number.isFinite(defaultPlanCents) ? defaultPlanCents : 9900;
    return status === SubscriptionStatus.ACTIVE ? planCents : 0;
  }

  async getOverview(): Promise<AdminOverviewResponse> {
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [tenants, newTenants7d, newTenants30d] = await Promise.all([
      this.prisma.organization.findMany({
        where: { isDemo: false },
        select: {
          isDisabled: true,
          subscriptionStatus: true,
        },
      }),
      this.prisma.organization.count({ where: { createdAt: { gte: sevenDaysAgo }, isDemo: false } }),
      this.prisma.organization.count({ where: { createdAt: { gte: thirtyDaysAgo }, isDemo: false } }),
    ]);

    let activeSubscriptions = 0;
    let trials = 0;
    let pastDue = 0;
    let canceled = 0;
    let mrrCents = 0;
    let activeTenants = 0;

    for (const tenant of tenants) {
      if (tenant.isDisabled) continue;
      activeTenants += 1;
      const status = (tenant.subscriptionStatus?.toUpperCase() ?? 'FREE') as SubscriptionStatus | 'FREE';
      if (status === SubscriptionStatus.ACTIVE) activeSubscriptions += 1;
      if (status === SubscriptionStatus.TRIAL) trials += 1;
      if (status === SubscriptionStatus.PAST_DUE) pastDue += 1;
      if (status === SubscriptionStatus.CANCELED) canceled += 1;
      mrrCents += this.resolveMrrCents(status);
    }

    return { totals: { mrrCents, activeTenants, activeSubscriptions, trials, pastDue, canceled }, trends: { newTenants7d, newTenants30d } };
  }

  async listTenants(page: number, query?: string): Promise<{ items: AdminTenantListItem[]; page: number; total: number }> {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const pageSize = 20;
    const normalizedQuery = query?.trim();
    const baseWhere = normalizedQuery
      ? { name: { contains: normalizedQuery, mode: 'insensitive' as const }, isDemo: false }
      : { isDemo: false };

    const [total, organizations] = await Promise.all([
      this.prisma.organization.count({ where: baseWhere }),
      this.prisma.organization.findMany({
        where: baseWhere,
        skip: (safePage - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { gyms: true, users: true } },
        },
      }),
    ]);

    const items = organizations.map((organization) => {
      const subscriptionStatus = (organization.subscriptionStatus?.toUpperCase() ?? 'FREE') as SubscriptionStatus | 'FREE';
      const whiteLabelBranding = organization.whiteLabelEnabled || organization.whiteLabelBrandingEnabled;
      return {
        tenantId: organization.id,
        tenantName: organization.name,
        createdAt: organization.createdAt.toISOString(),
        subscriptionStatus,
        priceId: organization.stripeSubscriptionId ?? null,
        mrrCents: this.resolveMrrCents(subscriptionStatus),
        whiteLabelEligible: organization._count.gyms > 0,
        whiteLabelEnabledEffective: whiteLabelBranding,
        locationsCount: organization._count.gyms,
        usersCount: organization._count.users,
        isDisabled: organization.isDisabled,
      };
    });

    return { items, page: safePage, total };
  }

  async listLeads() {
    return this.prisma.lead.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
  }

  async getTrialConversion() {
    const tenants = await this.prisma.organization.findMany({
      where: { trialStartedAt: { not: null }, isDemo: false },
      select: { id: true, trialStartedAt: true, upgradedAt: true, trialEndsAt: true },
    });

    const started = tenants.length;
    const upgraded = tenants.filter((tenant) => Boolean(tenant.upgradedAt)).length;
    const conversionRate = started === 0 ? 0 : upgraded / started;
    const upgradedDurations = tenants
      .filter((tenant) => tenant.trialStartedAt && tenant.upgradedAt)
      .map((tenant) => (tenant.upgradedAt!.getTime() - tenant.trialStartedAt!.getTime()) / (24 * 60 * 60 * 1000));
    const timeToConvertDays = upgradedDurations.length === 0
      ? null
      : upgradedDurations.reduce((sum, value) => sum + value, 0) / upgradedDurations.length;

    return { started, upgraded, conversionRate, timeToConvertDays };
  }

  async getReferralTree() {
    const tenants = await this.prisma.organization.findMany({
      select: { id: true, name: true, referralCode: true, referredByTenantId: true },
      orderBy: { createdAt: 'asc' },
    });

    return tenants.map((tenant) => ({
      tenantId: tenant.id,
      name: tenant.name,
      referralCode: tenant.referralCode,
      referredByTenantId: tenant.referredByTenantId,
      referredTenants: tenants.filter((candidate) => candidate.referredByTenantId === tenant.id).map((candidate) => ({
        tenantId: candidate.id,
        name: candidate.name,
      })),
    }));
  }

  async getTenant(tenantId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      include: {
        gyms: { orderBy: { createdAt: 'asc' }, select: { id: true, name: true, slug: true, createdAt: true } },
        users: true,
        adminEvents: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!organization) return null;

    return {
      tenant: {
        id: organization.id,
        name: organization.name,
        createdAt: organization.createdAt.toISOString(),
        subscriptionStatus: organization.subscriptionStatus ?? null,
        whiteLabelBranding: organization.whiteLabelEnabled || organization.whiteLabelBrandingEnabled,
      },
      locations: organization.gyms.map((gym) => ({ id: gym.id, name: gym.name, slug: gym.slug, createdAt: gym.createdAt.toISOString() })),
      keyUsers: organization.users,
      billing: {
        subscriptionStatus: organization.subscriptionStatus ?? SubscriptionStatus.FREE,
        priceId: organization.stripeSubscriptionId ?? null,
        mrrCents: this.resolveMrrCents((organization.subscriptionStatus?.toUpperCase() ?? 'FREE') as SubscriptionStatus | 'FREE'),
      },
      events: organization.adminEvents.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })),
    };
  }

  async toggleTenantActive(tenantId: string, adminUserId: string): Promise<{ tenantId: string; isDisabled: boolean }> {
    const org = await this.prisma.organization.findUnique({ where: { id: tenantId }, select: { id: true, isDisabled: true } });
    if (!org) throw new NotFoundException('Tenant not found');
    const isDisabled = !org.isDisabled;
    await this.prisma.organization.update({ where: { id: tenantId }, data: { isDisabled, disabledAt: isDisabled ? new Date() : null } });
    await this.prisma.adminEvent.create({ data: { adminUserId, tenantId, type: isDisabled ? 'TENANT_DISABLED' : 'TENANT_ENABLED' } });
    return { tenantId, isDisabled };
  }

  async impersonateTenant(tenantId: string, adminUserId: string, ip: string | undefined): Promise<{ tenantId: string; supportMode: { tenantId: string } }> {
    const org = await this.prisma.organization.findUnique({ where: { id: tenantId }, select: { id: true } });
    if (!org) throw new NotFoundException('Tenant not found');
    await this.prisma.adminEvent.create({ data: { adminUserId, tenantId, type: 'IMPERSONATE_START', metadata: { tenantId }, ip: ip ?? null } });
    return { tenantId, supportMode: { tenantId } };
  }

  async searchUsers(query?: string) {
    const normalizedQuery = query?.trim();
    return this.prisma.user.findMany({
      where: normalizedQuery ? { OR: [{ email: { contains: normalizedQuery, mode: 'insensitive' } }, { id: { contains: normalizedQuery, mode: 'insensitive' } }] } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, email: true, status: true, role: true, createdAt: true, orgId: true },
    });
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, role: true, status: true, createdAt: true,
        memberships: { select: { id: true, orgId: true, gymId: true, role: true, status: true, createdAt: true } },
        refreshTokens: { where: { revokedAt: null }, select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!user) return null;
    return { ...user, lastLoginAt: user.refreshTokens[0]?.createdAt ?? null, activeSessions: user.refreshTokens.length };
  }

  async revokeUserSessions(userId: string, actorUserId: string) {
    const now = new Date();
    const result = await this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
    await this.prisma.auditLog.create({
      data: {
        actorType: 'ADMIN', actorUserId, tenantId: null, action: 'ADMIN_REVOKE_SESSIONS', targetType: 'USER',
        targetId: userId, metadata: { revokedCount: result.count }, entityType: 'USER', entityId: userId,
      },
    });
    return { ok: true as const, revoked: result.count };
  }

  async listImpersonationHistory() {
    return this.prisma.auditLog.findMany({
      where: { OR: [{ action: 'support_mode_assume_context' }, { action: 'ADMIN_IMPERSONATE' }] },
      orderBy: { createdAt: 'desc' }, take: 100,
      select: { id: true, action: true, metadata: true, createdAt: true, actorUser: { select: { id: true, email: true } } },
    });
  }

  async listAudit(filters: { tenantId?: string; action?: string; actor?: string; from?: string; to?: string }) {
    return this.prisma.auditLog.findMany({
      where: {
        tenantId: filters.tenantId || undefined,
        action: filters.action || undefined,
        actorUser: filters.actor ? { email: { contains: filters.actor, mode: 'insensitive' as const } } : undefined,
        createdAt: { gte: filters.from ? new Date(filters.from) : undefined, lte: filters.to ? new Date(filters.to) : undefined },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { id: true, actorType: true, action: true, targetType: true, targetId: true, tenantId: true, locationId: true, metadata: true, createdAt: true, actorUser: { select: { id: true, email: true } } },
    });
  }
}
