import { Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole, MembershipStatus, SubscriptionStatus } from '@prisma/client';
import { JobLogService } from '../jobs/job-log.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobLogService: JobLogService,
  ) {}

  private resolveMrrCents(status: SubscriptionStatus | 'FREE'): number {
    const planCents = Number.parseInt(process.env.DEFAULT_TENANT_MRR_CENTS ?? '9900', 10);
    return status === SubscriptionStatus.ACTIVE ? (Number.isFinite(planCents) ? planCents : 9900) : 0;
  }

  async getOverview() {
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [tenants, newTenants7d, newTenants30d] = await Promise.all([
      this.prisma.organization.findMany({ include: { users: { select: { subscriptionStatus: true }, take: 1, orderBy: { createdAt: 'desc' } } } }),
      this.prisma.organization.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.organization.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    const totals = tenants.reduce(
      (acc, tenant) => {
        if (tenant.isDisabled) {
          return acc;
        }
        const status = tenant.users[0]?.subscriptionStatus ?? SubscriptionStatus.FREE;
        acc.activeTenants += 1;
        acc.activeSubscriptions += status === SubscriptionStatus.ACTIVE ? 1 : 0;
        acc.trials += status === SubscriptionStatus.TRIAL ? 1 : 0;
        acc.pastDue += status === SubscriptionStatus.PAST_DUE ? 1 : 0;
        acc.canceled += status === SubscriptionStatus.CANCELED ? 1 : 0;
        acc.mrrCents += this.resolveMrrCents(status);
        return acc;
      },
      { mrrCents: 0, activeTenants: 0, activeSubscriptions: 0, trials: 0, pastDue: 0, canceled: 0 },
    );

    return { totals, trends: { newTenants7d, newTenants30d } };
  }

  async listTenants(page: number, query?: string) {
    const pageSize = 20;
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const normalizedQuery = query?.trim();
    const where = normalizedQuery ? { name: { contains: normalizedQuery, mode: 'insensitive' as const } } : {};

    const [total, organizations] = await Promise.all([
      this.prisma.organization.count({ where }),
      this.prisma.organization.findMany({
        where,
        skip: (safePage - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { gyms: true, users: true, customDomains: true } },
          users: { select: { subscriptionStatus: true, stripeSubscriptionId: true }, take: 1, orderBy: { createdAt: 'desc' } },
          memberships: { where: { status: MembershipStatus.ACTIVE }, select: { role: true } },
        },
      }),
    ]);

    const items = organizations.map((organization) => {
      const status = organization.users[0]?.subscriptionStatus ?? SubscriptionStatus.FREE;
      return {
        tenantId: organization.id,
        tenantName: organization.name,
        createdAt: organization.createdAt.toISOString(),
        subscriptionStatus: status,
        priceId: organization.users[0]?.stripeSubscriptionId ?? null,
        mrrCents: this.resolveMrrCents(status),
        whiteLabelEligible: organization._count.gyms > 0,
        whiteLabelEnabledEffective: organization.whiteLabelEnabled || organization.whiteLabelBrandingEnabled,
        locationsCount: organization._count.gyms,
        usersCount: organization._count.users,
        ownersCount: organization.memberships.filter((membership) => membership.role === MembershipRole.TENANT_OWNER).length,
        managersCount: organization.memberships.filter((membership) => membership.role === MembershipRole.TENANT_LOCATION_ADMIN).length,
        customDomainsCount: organization._count.customDomains,
        isDisabled: organization.isDisabled,
      };
    });

    return { items, page: safePage, total };
  }

  async listJobs(page: number) {
    const pageSize = 50;
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const [items, total] = await Promise.all([this.jobLogService.list(safePage, pageSize), this.jobLogService.count()]);
    return { items, page: safePage, total };
  }

  async getTenant(tenantId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      include: {
        gyms: { select: { id: true, name: true, slug: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
        users: { select: { id: true, email: true, subscriptionStatus: true, stripeSubscriptionId: true }, take: 5, orderBy: { createdAt: 'asc' } },
        adminEvents: { take: 50, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!organization) return null;
    const status = organization.users[0]?.subscriptionStatus ?? SubscriptionStatus.FREE;
    return {
      tenant: {
        id: organization.id,
        name: organization.name,
        createdAt: organization.createdAt.toISOString(),
        subscriptionStatus: organization.subscriptionStatus ?? null,
        whiteLabelBranding: organization.whiteLabelEnabled || organization.whiteLabelBrandingEnabled,
      },
      locations: organization.gyms.map((gym) => ({ ...gym, createdAt: gym.createdAt.toISOString() })),
      keyUsers: organization.users,
      billing: { subscriptionStatus: status, priceId: organization.users[0]?.stripeSubscriptionId ?? null, mrrCents: this.resolveMrrCents(status) },
      events: organization.adminEvents.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })),
    };
  }

  async setTenantFeatures(tenantId: string, payload: { whiteLabelBranding: boolean }, adminUserId: string) {
    await this.prisma.organization.update({
      where: { id: tenantId },
      data: { whiteLabelBrandingEnabled: payload.whiteLabelBranding, whiteLabelEnabled: payload.whiteLabelBranding },
    });

    await this.prisma.adminEvent.create({
      data: { adminUserId, tenantId, type: 'TENANT_FEATURES_UPDATED', metadata: payload },
    });

    return { tenantId, ...payload };
  }

  async toggleTenantActive(tenantId: string, adminUserId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: tenantId }, select: { id: true, isDisabled: true } });
    if (!org) throw new NotFoundException('Tenant not found');
    const isDisabled = !org.isDisabled;
    await this.prisma.organization.update({ where: { id: tenantId }, data: { isDisabled, disabledAt: isDisabled ? new Date() : null } });
    await this.prisma.adminEvent.create({ data: { adminUserId, tenantId, type: isDisabled ? 'TENANT_DISABLED' : 'TENANT_ENABLED' } });
    return { tenantId, isDisabled };
  }

  async impersonateTenant(tenantId: string, adminUserId: string, ip: string | undefined) {
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
    await this.prisma.auditLog.create({ data: { actorType: 'ADMIN', actorUserId, action: 'ADMIN_REVOKE_SESSIONS', targetType: 'USER', targetId: userId, metadata: { revokedCount: result.count }, entityType: 'USER', entityId: userId } });
    return { ok: true as const, revoked: result.count };
  }

  listImpersonationHistory() {
    return this.prisma.auditLog.findMany({
      where: { OR: [{ action: 'support_mode_assume_context' }, { action: 'ADMIN_IMPERSONATE' }] },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, action: true, metadata: true, createdAt: true, actorUser: { select: { id: true, email: true } } },
    });
  }

  listAudit(filters: { tenantId?: string; action?: string; actor?: string; from?: string; to?: string }) {
    return this.prisma.auditLog.findMany({
      where: {
        tenantId: filters.tenantId || undefined,
        action: filters.action || undefined,
        actorUser: filters.actor ? { email: { contains: filters.actor, mode: 'insensitive' } } : undefined,
        createdAt: { gte: filters.from ? new Date(filters.from) : undefined, lte: filters.to ? new Date(filters.to) : undefined },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { id: true, actorType: true, action: true, targetType: true, targetId: true, tenantId: true, locationId: true, metadata: true, createdAt: true, actorUser: { select: { id: true, email: true } } },
    });
  }
}
