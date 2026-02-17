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
        select: {
          id: true,
          isDisabled: true,
          users: {
            select: {
              subscriptionStatus: true,
              stripeSubscriptionId: true,
            },
            where: { orgId: { not: null } },
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
      const latestUser = tenant.users[0];
      const status = latestUser?.subscriptionStatus ?? SubscriptionStatus.FREE;
      if (status === SubscriptionStatus.ACTIVE) {
        activeSubscriptions += 1;
      }
      if (status === SubscriptionStatus.TRIAL) {
        trials += 1;
      }
      if (status === SubscriptionStatus.PAST_DUE) {
        pastDue += 1;
      }
      if (status === SubscriptionStatus.CANCELED) {
        canceled += 1;
      }
      mrrCents += this.resolveMrrCents(status);
    }

    return {
      totals: { mrrCents, activeTenants, activeSubscriptions, trials, pastDue, canceled },
      trends: { newTenants7d, newTenants30d },
    };
  }

  async listTenants(page: number, query?: string, status?: string): Promise<{ items: AdminTenantListItem[]; page: number; total: number }> {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const pageSize = 20;
    const normalizedQuery = query?.trim();
    const normalizedStatus = status?.trim().toUpperCase();

    const baseWhere = normalizedQuery
      ? {
        name: {
          contains: normalizedQuery,
          mode: 'insensitive' as const,
        },
      }
      : {};

    const [total, organizations] = await Promise.all([
      this.prisma.organization.count({ where: baseWhere }),
      this.prisma.organization.findMany({
        where: baseWhere,
        skip: (safePage - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { gyms: true, users: true, customDomains: true } },
          memberships: { where: { status: MembershipStatus.ACTIVE }, select: { role: true } },
          users: {
            select: {
              subscriptionStatus: true,
              stripeSubscriptionId: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    const mapped = organizations.map((organization) => {
      const latestUser = organization.users[0];
      const subscriptionStatus = latestUser?.subscriptionStatus ?? SubscriptionStatus.FREE;
      const ownersCount = organization.memberships.filter((membership) => membership.role === MembershipRole.TENANT_OWNER).length;
      const managersCount = organization.memberships.filter((membership) => membership.role === MembershipRole.TENANT_LOCATION_ADMIN).length;
      const whiteLabelBranding = organization.whiteLabelEnabled || organization.whiteLabelBrandingEnabled;
      return {
        tenantId: organization.id,
        tenantName: organization.name,
        createdAt: organization.createdAt.toISOString(),
        subscriptionStatus,
        priceId: latestUser?.stripeSubscriptionId ?? null,
        mrrCents: this.resolveMrrCents(subscriptionStatus),
        whiteLabelEligible: organization._count.gyms > 0,
        whiteLabelEnabledEffective: whiteLabelBranding,
        whiteLabelBranding,
        locationsCount: organization._count.gyms,
        usersCount: organization._count.users,
        ownersCount,
        managersCount,
        customDomainsCount: organization._count.customDomains,
        isDisabled: organization.isDisabled,
      };
    });

    const filtered = normalizedStatus
      ? mapped.filter((item) => item.subscriptionStatus === normalizedStatus)
      : mapped;

    return {
      items: filtered,
      page: safePage,
      total,
    };
  }

  async getTenant(tenantId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      include: {
        gyms: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, name: true, slug: true, createdAt: true },
        },
        users: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, email: true, role: true, subscriptionStatus: true, stripeSubscriptionId: true },
        },
        adminEvents: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: { id: true, type: true, metadata: true, createdAt: true, adminUserId: true },
        },
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
        isDisabled: organization.isDisabled,
        disabledAt: organization.disabledAt?.toISOString() ?? null,
      },
      locations: organization.gyms.map((gym) => ({
        id: gym.id,
        name: gym.name,
        slug: gym.slug,
        createdAt: gym.createdAt.toISOString(),
      })),
      keyUsers: organization.users,
      billing: {
        subscriptionStatus: organization.users[0]?.subscriptionStatus ?? SubscriptionStatus.FREE,
        priceId: organization.users[0]?.stripeSubscriptionId ?? null,
        mrrCents: this.resolveMrrCents(organization.users[0]?.subscriptionStatus ?? SubscriptionStatus.FREE),
      },
      events: organization.adminEvents.map((event) => ({
        ...event,
        createdAt: event.createdAt.toISOString(),
      })),
    };
  }

  async toggleTenantActive(tenantId: string, adminUserId: string): Promise<{ tenantId: string; isDisabled: boolean }> {
    const org = await this.prisma.organization.findUnique({ where: { id: tenantId }, select: { id: true, isDisabled: true } });
    if (!org) {
      throw new NotFoundException('Tenant not found');
    }

    const isDisabled = !org.isDisabled;
    await this.prisma.organization.update({
      where: { id: tenantId },
      data: {
        isDisabled,
        disabledAt: isDisabled ? new Date() : null,
      },
    });

    await this.prisma.adminEvent.create({
      data: {
        adminUserId,
        tenantId,
        type: isDisabled ? 'TENANT_DISABLED' : 'TENANT_ENABLED',
      },
    });

    return { tenantId, isDisabled };
  }

  async impersonateTenant(tenantId: string, adminUserId: string, ip: string | undefined): Promise<{ tenantId: string; supportMode: { tenantId: string } }> {
    const org = await this.prisma.organization.findUnique({ where: { id: tenantId }, select: { id: true } });
    if (!org) {
      throw new NotFoundException('Tenant not found');
    }

    await this.prisma.adminEvent.create({
      data: {
        adminUserId,
        tenantId,
        type: 'IMPERSONATE_START',
        metadata: { tenantId },
        ip: ip ?? null,
      },
    });

    return {
      tenantId,
      supportMode: { tenantId },
    };
  }
}
