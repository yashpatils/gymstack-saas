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

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveMrrCents(status: SubscriptionStatus | 'FREE'): number {
    const planCents = Number.parseInt(process.env.DEFAULT_TENANT_MRR_CENTS ?? '9900', 10);
    return status === SubscriptionStatus.ACTIVE ? (Number.isFinite(planCents) ? planCents : 9900) : 0;
  }

  async getOverview(): Promise<AdminOverviewResponse> {
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [activeTenants, newTenants7d, newTenants30d] = await Promise.all([
      this.prisma.organization.count({ where: { isDisabled: false } }),
      this.prisma.organization.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.organization.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    return {
      totals: {
        mrrCents: activeTenants * this.resolveMrrCents(SubscriptionStatus.ACTIVE),
        activeTenants,
        activeSubscriptions: activeTenants,
        trials: 0,
        pastDue: 0,
        canceled: 0,
      },
      trends: { newTenants7d, newTenants30d },
    };
  }

  async listTenants(page: number, pageSize: number, query?: string) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));

    const where = query?.trim()
      ? { name: { contains: query.trim(), mode: 'insensitive' as const } }
      : undefined;

    const [items, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
        include: {
          _count: { select: { gyms: true, customDomains: true, users: true } },
          memberships: {
            where: { status: MembershipStatus.ACTIVE },
            select: { role: true },
          },
        },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      items: items.map((org) => ({
        tenantId: org.id,
        tenantName: org.name,
        createdAt: org.createdAt.toISOString(),
        locationsCount: org._count.gyms,
        ownersCount: org.memberships.filter((m) => m.role === MembershipRole.TENANT_OWNER).length,
        managersCount: org.memberships.filter((m) => m.role === MembershipRole.TENANT_LOCATION_ADMIN).length,
        customDomainsCount: org._count.customDomains,
        subscriptionStatus: org.subscriptionStatus ?? null,
        whiteLabelBranding: org.whiteLabelEnabled || org.whiteLabelBrandingEnabled,
      })),
      page: safePage,
      total,
    };
  }

  async getTenant(tenantId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      include: {
        gyms: { select: { id: true, name: true, slug: true, createdAt: true } },
        users: { select: { id: true, email: true, role: true, status: true } },
        adminEvents: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!organization) {
      return null;
    }

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
      billing: {
        subscriptionStatus: SubscriptionStatus.FREE,
        priceId: null,
        mrrCents: 0,
      },
      events: organization.adminEvents.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })),
    };
  }

  async toggleTenantActive(tenantId: string, adminUserId: string): Promise<{ tenantId: string; isDisabled: boolean }> {
    const org = await this.prisma.organization.findUnique({ where: { id: tenantId }, select: { id: true, isDisabled: true } });
    if (!org) {
      throw new NotFoundException('Tenant not found');
    }

    const isDisabled = !org.isDisabled;
    await this.prisma.organization.update({ where: { id: tenantId }, data: { isDisabled, disabledAt: isDisabled ? new Date() : null } });
    await this.prisma.adminEvent.create({ data: { adminUserId, tenantId, type: isDisabled ? 'TENANT_DISABLED' : 'TENANT_ENABLED' } });
    return { tenantId, isDisabled };
  }

  async impersonateTenant(tenantId: string, adminUserId: string, ip: string | undefined): Promise<{ tenantId: string; supportMode: { tenantId: string } }> {
    const org = await this.prisma.organization.findUnique({ where: { id: tenantId }, select: { id: true } });
    if (!org) {
      throw new NotFoundException('Tenant not found');
    }

    await this.prisma.adminEvent.create({ data: { adminUserId, tenantId, type: 'IMPERSONATE_START', metadata: { tenantId }, ip: ip ?? null } });
    return { tenantId, supportMode: { tenantId } };
  }

  async setTenantFeatures(tenantId: string, input: { whiteLabelBranding: boolean }, adminUserId: string) {
    const updated = await this.prisma.organization.update({
      where: { id: tenantId },
      data: {
        whiteLabelEnabled: input.whiteLabelBranding,
        whiteLabelBrandingEnabled: input.whiteLabelBranding,
      },
      select: { id: true, whiteLabelEnabled: true, whiteLabelBrandingEnabled: true },
    });

    await this.prisma.adminEvent.create({ data: { adminUserId, tenantId, type: 'TENANT_FEATURES_UPDATED', metadata: input } });

    return { tenantId: updated.id, whiteLabelBranding: updated.whiteLabelEnabled || updated.whiteLabelBrandingEnabled };
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
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        memberships: { select: { id: true, orgId: true, gymId: true, role: true, status: true, createdAt: true } },
        refreshTokens: { orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, createdAt: true, revokedAt: true, expiresAt: true } },
      },
    });
  }

  async revokeUserSessions(userId: string, actorUserId: string) {
    const now = new Date();
    const result = await this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
    await this.prisma.auditLog.create({ data: { actorType: 'ADMIN', actorUserId, action: 'ADMIN_REVOKE_SESSIONS', targetType: 'USER', targetId: userId, metadata: { revokedCount: result.count }, entityType: 'USER', entityId: userId } });
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
        actorUser: filters.actor ? { email: { contains: filters.actor, mode: 'insensitive' as const } } : undefined,
        createdAt: { gte: filters.from ? new Date(filters.from) : undefined, lte: filters.to ? new Date(filters.to) : undefined },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { id: true, actorType: true, action: true, targetType: true, targetId: true, tenantId: true, locationId: true, metadata: true, createdAt: true, actorUser: { select: { id: true, email: true } } },
    });
  }

  async getMigrationStatus() {
    type MigrationRow = { migration_name: string; started_at: Date; finished_at: Date | null; rolled_back_at: Date | null; logs: string | null };
    const rows = await this.prisma.$queryRaw<MigrationRow[]>`
      SELECT migration_name, started_at, finished_at, rolled_back_at, logs
      FROM _prisma_migrations
      ORDER BY started_at DESC
      LIMIT 100
    `;
    const failed = rows.filter((row) => row.finished_at === null && row.rolled_back_at === null);
    return {
      checkedAt: new Date().toISOString(),
      total: rows.length,
      failedCount: failed.length,
      failedMigrations: failed.map((row) => ({ migrationName: row.migration_name, startedAt: row.started_at.toISOString(), logs: row.logs })),
      migrations: rows.map((row) => ({ migrationName: row.migration_name, startedAt: row.started_at.toISOString(), finishedAt: row.finished_at ? row.finished_at.toISOString() : null, rolledBackAt: row.rolled_back_at ? row.rolled_back_at.toISOString() : null })),
      guidance: ['Take an immediate backup/snapshot before manual intervention.', 'Inspect the failed migration SQL and deployment logs.', 'Use prisma migrate resolve --rolled-back or --applied after validation.', 'Re-run prisma migrate deploy once the state is consistent.'],
    };
  }
}
