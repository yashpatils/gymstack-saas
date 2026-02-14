import { Injectable } from '@nestjs/common';
import { MembershipStatus, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AdminMetrics = {
  mrr: number;
  arr: number;
  activeTenants: number;
  activeLocations: number;
  activeSubscriptions: number;
  trialingCount: number;
  pastDueCount: number;
};

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(): Promise<AdminMetrics> {
    const [activeTenants, activeLocations, activeSubscriptions, trialingCount, pastDueCount] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.gym.count(),
      this.prisma.user.count({ where: { subscriptionStatus: SubscriptionStatus.ACTIVE } }),
      this.prisma.user.count({ where: { subscriptionStatus: SubscriptionStatus.TRIAL } }),
      this.prisma.user.count({ where: { subscriptionStatus: SubscriptionStatus.PAST_DUE } }),
    ]);

    return {
      mrr: 0,
      arr: 0,
      activeTenants,
      activeLocations,
      activeSubscriptions,
      trialingCount,
      pastDueCount,
    };
  }

  async listTenants(page: number, pageSize: number): Promise<{ items: Array<{ id: string; name: string; createdAt: string; plan: string; subscriptionStatus: SubscriptionStatus | 'FREE'; locationCount: number }>; total: number; page: number; pageSize: number }> {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safePageSize = Number.isFinite(pageSize) ? Math.min(Math.max(Math.floor(pageSize), 1), 100) : 20;

    const [total, organizations] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.organization.findMany({
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              gyms: true,
            },
          },
          users: {
            select: {
              subscriptionStatus: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
            take: 1,
          },
        },
      }),
    ]);

    return {
      items: organizations.map((organization) => ({
        id: organization.id,
        name: organization.name,
        createdAt: organization.createdAt.toISOString(),
        plan: 'TODO_STRIPE_PLAN',
        subscriptionStatus: organization.users[0]?.subscriptionStatus ?? SubscriptionStatus.FREE,
        locationCount: organization._count.gyms,
      })),
      total,
      page: safePage,
      pageSize: safePageSize,
    };
  }

  async getTenant(tenantId: string): Promise<{
    id: string;
    name: string;
    createdAt: string;
    locations: Array<{ id: string; name: string; slug: string; createdAt: string }>;
    membershipCounts: {
      total: number;
      active: number;
      invited: number;
      disabled: number;
    };
  } | null> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      include: {
        gyms: {
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!organization) {
      return null;
    }

    const [total, active, invited, disabled] = await Promise.all([
      this.prisma.membership.count({ where: { orgId: tenantId } }),
      this.prisma.membership.count({ where: { orgId: tenantId, status: MembershipStatus.ACTIVE } }),
      this.prisma.membership.count({ where: { orgId: tenantId, status: MembershipStatus.INVITED } }),
      this.prisma.membership.count({ where: { orgId: tenantId, status: MembershipStatus.DISABLED } }),
    ]);

    return {
      id: organization.id,
      name: organization.name,
      createdAt: organization.createdAt.toISOString(),
      locations: organization.gyms.map((gym) => ({
        id: gym.id,
        name: gym.name,
        slug: gym.slug,
        createdAt: gym.createdAt.toISOString(),
      })),
      membershipCounts: {
        total,
        active,
        invited,
        disabled,
      },
    };
  }
}
