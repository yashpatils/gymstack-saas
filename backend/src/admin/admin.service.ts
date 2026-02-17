import { Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole, MembershipStatus, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveMrrCents(status: SubscriptionStatus | 'FREE'): number {
    const defaultPlanCents = Number.parseInt(process.env.DEFAULT_TENANT_MRR_CENTS ?? '9900', 10);
    return Number.isFinite(defaultPlanCents) && status === SubscriptionStatus.ACTIVE ? defaultPlanCents : 0;
  }

  async getOverview() {
    const [activeTenants, tenantsTotal] = await Promise.all([
      this.prisma.organization.count({ where: { isDisabled: false } }),
      this.prisma.organization.count(),
    ]);
    return { totals: { activeTenants, tenantsTotal, mrrCents: activeTenants * this.resolveMrrCents(SubscriptionStatus.ACTIVE) } };
  }

  async listTenants(page: number, query?: string) {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const pageSize = 20;
    const where = query?.trim() ? { name: { contains: query.trim(), mode: 'insensitive' as const } } : undefined;
    const [total, organizations] = await Promise.all([
      this.prisma.organization.count({ where }),
      this.prisma.organization.findMany({
        where,
        skip: (safePage - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { gyms: true, users: true } },
          memberships: { where: { status: MembershipStatus.ACTIVE }, select: { role: true } },
          apiKeys: { where: { revokedAt: null }, select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      page: safePage,
      total,
      items: organizations.map((organization) => ({
        tenantId: organization.id,
        tenantName: organization.name,
        createdAt: organization.createdAt.toISOString(),
        locationsCount: organization._count.gyms,
        usersCount: organization._count.users,
        ownersCount: organization.memberships.filter((membership) => membership.role === MembershipRole.TENANT_OWNER).length,
        isDisabled: organization.isDisabled,
        activeApiKeys: organization.apiKeys.length,
      })),
    };
  }

  async getTenant(tenantId: string) {
    const organization = await this.prisma.organization.findUnique({ where: { id: tenantId }, include: { gyms: true, users: true, adminEvents: true } });
    if (!organization) return null;
    return {
      tenant: { id: organization.id, name: organization.name, createdAt: organization.createdAt.toISOString() },
      locations: organization.gyms,
      keyUsers: organization.users,
      events: organization.adminEvents,
    };
  }

  async toggleTenantActive(tenantId: string, adminUserId: string): Promise<{ tenantId: string; isDisabled: boolean }> {
    const org = await this.prisma.organization.findUnique({ where: { id: tenantId }, select: { isDisabled: true } });
    if (!org) throw new NotFoundException('Tenant not found');
    const isDisabled = !org.isDisabled;
    await this.prisma.organization.update({ where: { id: tenantId }, data: { isDisabled, disabledAt: isDisabled ? new Date() : null } });
    await this.prisma.adminEvent.create({ data: { adminUserId, tenantId, type: isDisabled ? 'TENANT_DISABLED' : 'TENANT_ENABLED' } });
    return { tenantId, isDisabled };
  }

  async impersonateTenant(tenantId: string, adminUserId: string, ip: string | undefined): Promise<{ tenantId: string; supportMode: { tenantId: string } }> {
    await this.prisma.adminEvent.create({ data: { adminUserId, tenantId, type: 'IMPERSONATE_START', metadata: { tenantId }, ip: ip ?? null } });
    return { tenantId, supportMode: { tenantId } };
  }

  async getApiUsageByTenant() {
    const keys = await this.prisma.apiKey.findMany({ select: { tenantId: true, lastUsedAt: true, revokedAt: true } });
    const grouped = new Map<string, { total: number; active: number; recentUses: number }>();
    for (const key of keys) {
      const entry = grouped.get(key.tenantId) ?? { total: 0, active: 0, recentUses: 0 };
      entry.total += 1;
      if (!key.revokedAt) entry.active += 1;
      if (key.lastUsedAt && key.lastUsedAt.getTime() > Date.now() - 24 * 60 * 60 * 1000) entry.recentUses += 1;
      grouped.set(key.tenantId, entry);
    }
    return [...grouped.entries()].map(([tenantId, metrics]) => ({ tenantId, ...metrics }));
  }

  disableApiKey(keyId: string) {
    return this.prisma.apiKey.update({ where: { id: keyId }, data: { revokedAt: new Date() } });
  }

  getWebhookFailures() {
    return this.prisma.webhookDelivery.findMany({ where: { responseStatus: { gte: 400 } }, orderBy: { createdAt: 'desc' }, take: 200, include: { webhookEndpoint: { select: { tenantId: true, url: true } } } });
  }

  async searchUsers(query?: string) { return this.prisma.user.findMany({ where: query ? { email: { contains: query, mode: 'insensitive' } } : undefined, take: 50 }); }
  async getUserDetail(userId: string) { return this.prisma.user.findUnique({ where: { id: userId }, include: { memberships: true, refreshTokens: true } }); }
  async revokeUserSessions(userId: string) { const result = await this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }); return { ok: true as const, revoked: result.count }; }
  async listImpersonationHistory() { return this.prisma.auditLog.findMany({ where: { action: 'ADMIN_IMPERSONATE' }, take: 100 }); }
  async listAudit() { return this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }); }
}
