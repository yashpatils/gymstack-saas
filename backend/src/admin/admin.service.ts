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
  ownersCount: number;
  managersCount: number;
  customDomainsCount: number;
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
        select: {
          isDisabled: true,
          users: {
            select: { subscriptionStatus: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.organization.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.organization.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    let activeSubscriptions = 0;
    let trials = 0;
    let pastDue = 0;
    let canceled = 0;
    let mrrCents = 0;
    let activeTenants = 0;

    for (const tenant of tenants) {
      if (tenant.isDisabled) {
        continue;
      }
      activeTenants += 1;
      const status = tenant.users[0]?.subscriptionStatus ?? SubscriptionStatus.FREE;
      if (status === SubscriptionStatus.ACTIVE) activeSubscriptions += 1;
      if (status === SubscriptionStatus.TRIAL) trials += 1;
      if (status === SubscriptionStatus.PAST_DUE) pastDue += 1;
      if (status === SubscriptionStatus.CANCELED) canceled += 1;
      mrrCents += this.resolveMrrCents(status);
    }

    return { totals: { mrrCents, activeTenants, activeSubscriptions, trials, pastDue, canceled }, trends: { newTenants7d, newTenants30d } };
  }

  async listTenants(page: number, pageSize: number, query?: string, status?: string): Promise<{ items: AdminTenantListItem[]; page: number; total: number }> {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.min(Math.floor(pageSize), 100) : 20;
    const normalizedQuery = query?.trim();
    const normalizedStatus = status?.trim().toUpperCase();

    const where = normalizedQuery
      ? {
          name: {
            contains: normalizedQuery,
            mode: 'insensitive' as const,
          },
        }
      : undefined;

    const [total, organizations] = await Promise.all([
      this.prisma.organization.count({ where }),
      this.prisma.organization.findMany({
        where,
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { gyms: true, users: true, customDomains: true } },
          memberships: { where: { status: MembershipStatus.ACTIVE }, select: { role: true } },
          users: { select: { subscriptionStatus: true, stripeSubscriptionId: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
    ]);

    const items = organizations
      .map((organization) => {
        const latestUser = organization.users[0];
        const subscriptionStatus = latestUser?.subscriptionStatus ?? SubscriptionStatus.FREE;
        return {
          tenantId: organization.id,
          tenantName: organization.name,
          createdAt: organization.createdAt.toISOString(),
          subscriptionStatus,
          priceId: latestUser?.stripeSubscriptionId ?? null,
          mrrCents: this.resolveMrrCents(subscriptionStatus),
          whiteLabelEligible: organization._count.gyms > 0,
          whiteLabelEnabledEffective: organization.whiteLabelEnabled || organization.whiteLabelBrandingEnabled,
          locationsCount: organization._count.gyms,
          usersCount: organization._count.users,
          ownersCount: organization.memberships.filter((membership) => membership.role === MembershipRole.TENANT_OWNER).length,
          managersCount: organization.memberships.filter((membership) => membership.role === MembershipRole.TENANT_LOCATION_ADMIN).length,
          customDomainsCount: organization._count.customDomains,
          isDisabled: organization.isDisabled,
        };
      })
      .filter((item) => (normalizedStatus ? item.subscriptionStatus === normalizedStatus : true));

    return { items, page: safePage, total };
  }

  async setTenantFeatures(tenantId: string, input: { whiteLabelBranding: boolean }, adminUserId: string) {
    const updated = await this.prisma.organization.update({
      where: { id: tenantId },
      data: { whiteLabelEnabled: input.whiteLabelBranding, whiteLabelBrandingEnabled: input.whiteLabelBranding },
      select: { id: true, whiteLabelEnabled: true, whiteLabelBrandingEnabled: true },
    });

    await this.prisma.adminEvent.create({
      data: { adminUserId, tenantId, type: 'TENANT_FEATURES_UPDATED', metadata: { whiteLabelBranding: input.whiteLabelBranding } },
    });

    return { tenantId: updated.id, whiteLabelBranding: updated.whiteLabelEnabled || updated.whiteLabelBrandingEnabled };
  }

  async getTenant(tenantId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      include: {
        gyms: { orderBy: { createdAt: 'asc' }, select: { id: true, name: true, slug: true, createdAt: true } },
        users: { select: { id: true, email: true, role: true, createdAt: true }, orderBy: { createdAt: 'asc' }, take: 10 },
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
        subscriptionStatus: organization.users[0]?.subscriptionStatus ?? SubscriptionStatus.FREE,
        priceId: organization.users[0]?.stripeSubscriptionId ?? null,
        mrrCents: this.resolveMrrCents(organization.users[0]?.subscriptionStatus ?? SubscriptionStatus.FREE),
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
      where: normalizedQuery
        ? { OR: [{ email: { contains: normalizedQuery, mode: 'insensitive' } }, { id: { contains: normalizedQuery, mode: 'insensitive' } }] }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, email: true, status: true, role: true, createdAt: true, orgId: true },
    });
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
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
        actorType: 'ADMIN', actorUserId, tenantId: null, action: 'ADMIN_REVOKE_SESSIONS', targetType: 'USER', targetId: userId,
        metadata: { revokedCount: result.count }, entityType: 'USER', entityId: userId,
      },
    });
    return { ok: true as const, revoked: result.count };
  }

  async listImpersonationHistory() {
    return this.prisma.auditLog.findMany({
      where: { OR: [{ action: 'support_mode_assume_context' }, { action: 'ADMIN_IMPERSONATE' }] },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, action: true, metadata: true, createdAt: true, actorUser: { select: { id: true, email: true } } },
    });
  }

  async listAudit(filters: { tenantId?: string; action?: string; actor?: string; from?: string; to?: string }) {
    return this.prisma.auditLog.findMany({
      where: {
        tenantId: filters.tenantId || undefined,
        action: filters.action || undefined,
        actorUser: filters.actor ? { email: { contains: filters.actor, mode: 'insensitive' } } : undefined,
        createdAt: { gte: filters.from ? new Date(filters.from) : undefined, lte: filters.to ? new Date(filters.to) : undefined },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true, actorType: true, action: true, targetType: true, targetId: true, tenantId: true, locationId: true,
        metadata: true, createdAt: true, actorUser: { select: { id: true, email: true } },
      },
    });
  }
}
