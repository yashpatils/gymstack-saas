import { Injectable } from '@nestjs/common';
import { MembershipRole, MembershipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AdminMetrics = {
  tenantsTotal: number;
  locationsTotal: number;
  usersTotal: number;
  signups7d: number;
  signups30d: number;
  activeMembershipsTotal: number;
  mrr?: number;
  activeSubscriptions?: number;
};

export type AdminTenantListItem = {
  tenantId: string;
  tenantName: string;
  createdAt: string;
  locationsCount: number;
  ownersCount: number;
  managersCount: number;
  customDomainsCount: number;
  subscriptionStatus?: string | null;
  whiteLabelBranding: boolean;
};

export type AdminTenantListResponse = {
  items: AdminTenantListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type AdminTenantDetailResponse = {
  tenant: { id: string; name: string; createdAt: string; subscriptionStatus?: string | null; whiteLabelBranding: boolean };
  locations: Array<{ id: string; name: string; slug: string; createdAt: string; membersCount: number; managersCount: number; customDomains: string[] }>;
  owners: Array<{ id: string; email: string; name?: string }>;
  recentAudit?: Array<{ id: string; action: string; createdAt: string; actorEmail?: string }>;
};

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  getUserById(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  }

  async getMetrics(): Promise<AdminMetrics> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [tenantsTotal, locationsTotal, usersTotal, signups7d, signups30d, activeMembershipsTotal] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.gym.count(),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.membership.count({ where: { status: MembershipStatus.ACTIVE } }),
    ]);

    return {
      tenantsTotal,
      locationsTotal,
      usersTotal,
      signups7d,
      signups30d,
      activeMembershipsTotal,
      mrr: 0,
      activeSubscriptions: 0,
    };
  }

  async listTenants(page: number, pageSize: number, query?: string): Promise<AdminTenantListResponse> {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safePageSize = Number.isFinite(pageSize) ? Math.min(Math.max(Math.floor(pageSize), 1), 100) : 20;
    const normalizedQuery = query?.trim();

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
          _count: {
            select: {
              gyms: true,
              customDomains: true,
            },
          },
          memberships: {
            where: { status: MembershipStatus.ACTIVE },
            select: { role: true },
          },
          users: {
            select: { subscriptionStatus: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    return {
      items: organizations.map((organization) => {
        const ownersCount = organization.memberships.filter((membership) => membership.role === MembershipRole.TENANT_OWNER).length;
        const managersCount = organization.memberships.filter((membership) => membership.role === MembershipRole.TENANT_LOCATION_ADMIN).length;

        return {
          tenantId: organization.id,
          tenantName: organization.name,
          createdAt: organization.createdAt.toISOString(),
          locationsCount: organization._count.gyms,
          ownersCount,
          managersCount,
          customDomainsCount: organization._count.customDomains,
          subscriptionStatus: organization.users[0]?.subscriptionStatus ?? null,
          whiteLabelBranding: organization.whiteLabelEnabled || organization.whiteLabelBrandingEnabled,
        };
      }),
      page: safePage,
      pageSize: safePageSize,
      total,
    };
  }

  async getTenant(tenantId: string): Promise<AdminTenantDetailResponse | null> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      include: {
        gyms: {
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true,
            customDomains: {
              select: {
                hostname: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        users: {
          select: {
            subscriptionStatus: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!organization) {
      return null;
    }

    const gymIds = organization.gyms.map((gym) => gym.id);

    const [ownersMemberships, memberCountsRaw, managerCountsRaw, recentAudit] = await Promise.all([
      this.prisma.membership.findMany({
        where: {
          orgId: tenantId,
          role: MembershipRole.TENANT_OWNER,
          status: MembershipStatus.ACTIVE,
        },
        select: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      }),
      gymIds.length > 0
        ? this.prisma.membership.groupBy({
          by: ['gymId'],
          where: {
            orgId: tenantId,
            status: MembershipStatus.ACTIVE,
            gymId: { in: gymIds },
          },
          _count: { _all: true },
        })
        : Promise.resolve([]),
      gymIds.length > 0
        ? this.prisma.membership.groupBy({
          by: ['gymId'],
          where: {
            orgId: tenantId,
            status: MembershipStatus.ACTIVE,
            role: MembershipRole.TENANT_LOCATION_ADMIN,
            gymId: { in: gymIds },
          },
          _count: { _all: true },
        })
        : Promise.resolve([]),
      this.prisma.auditLog.findMany({
        where: { orgId: tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          createdAt: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      }),
    ]);

    const memberCounts = new Map(
      memberCountsRaw
        .filter((item) => item.gymId)
        .map((item) => [item.gymId as string, item._count._all]),
    );

    const managerCounts = new Map(
      managerCountsRaw
        .filter((item) => item.gymId)
        .map((item) => [item.gymId as string, item._count._all]),
    );

    return {
      tenant: {
        id: organization.id,
        name: organization.name,
        createdAt: organization.createdAt.toISOString(),
        subscriptionStatus: organization.users[0]?.subscriptionStatus ?? null,
        whiteLabelBranding: organization.whiteLabelEnabled || organization.whiteLabelBrandingEnabled,
      },
      locations: organization.gyms.map((gym) => ({
        id: gym.id,
        name: gym.name,
        slug: gym.slug,
        createdAt: gym.createdAt.toISOString(),
        membersCount: memberCounts.get(gym.id) ?? 0,
        managersCount: managerCounts.get(gym.id) ?? 0,
        customDomains: gym.customDomains.map((domain) => domain.hostname),
      })),
      owners: ownersMemberships.map(({ user }) => ({
        id: user.id,
        email: user.email,
      })),
      recentAudit: recentAudit.map((entry) => ({
        id: entry.id,
        action: entry.action,
        createdAt: entry.createdAt.toISOString(),
        actorEmail: entry.user?.email,
      })),
    };
  }

  async setTenantFeatures(tenantId: string, features: { whiteLabelBranding: boolean }, actorUserId: string): Promise<{ tenantId: string; whiteLabelBranding: boolean }> {
    const tenant = await this.prisma.organization.update({
      where: { id: tenantId },
      data: { whiteLabelBrandingEnabled: features.whiteLabelBranding, whiteLabelEnabled: features.whiteLabelBranding },
      select: { id: true, whiteLabelBrandingEnabled: true, whiteLabelEnabled: true },
    });

    await this.prisma.auditLog.create({
      data: {
        orgId: tenant.id,
        userId: actorUserId,
        action: 'tenant.features.updated',
        entityType: 'organization',
        entityId: tenant.id,
        metadata: { whiteLabelBranding: tenant.whiteLabelEnabled || tenant.whiteLabelBrandingEnabled },
      },
    });

    return {
      tenantId: tenant.id,
      whiteLabelBranding: tenant.whiteLabelEnabled || tenant.whiteLabelBrandingEnabled,
    };
  }

}
