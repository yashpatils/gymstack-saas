import { ForbiddenException, Injectable } from '@nestjs/common';
import { MembershipRole, MembershipStatus, Prisma, Role, SubscriptionStatus, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DemoService {
  constructor(private readonly prisma: PrismaService, private readonly authService: AuthService) {}

  private async ensureDemoTenant() {
    const demo = await this.prisma.organization.findFirst({ where: { isDemo: true } });
    if (demo) return demo;

    const passwordHash = await bcrypt.hash('DemoOwner!234', 10);
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: 'GymStack Demo Gym',
          isDemo: true,
          referralCode: 'DEMO-GYMSTACK',
          trialStartedAt: now,
          trialEndsAt,
          subscriptionStatus: SubscriptionStatus.TRIAL,
        },
      });

      const owner = await tx.user.create({
        data: {
          email: 'demo-owner@gymstack.local',
          password: passwordHash,
          role: Role.USER,
          status: UserStatus.ACTIVE,
          orgId: organization.id,
          subscriptionStatus: SubscriptionStatus.TRIAL,
          emailVerifiedAt: now,
        },
      });

      const location = await tx.gym.create({
        data: {
          name: 'Downtown Demo Club',
          slug: `demo-${Date.now().toString().slice(-6)}`,
          ownerId: owner.id,
          orgId: organization.id,
          timezone: 'America/New_York',
        },
      });

      await tx.membership.create({ data: { orgId: organization.id, userId: owner.id, role: MembershipRole.TENANT_OWNER, status: MembershipStatus.ACTIVE } });

      await this.seedDemoData(tx, organization.id, location.id, owner.id);
      return organization;
    });
  }

  private async seedDemoData(tx: Prisma.TransactionClient, tenantId: string, locationId: string, ownerId: string) {
    const staffPassword = await bcrypt.hash('DemoStaff!234', 10);
    const staff = await tx.user.create({
      data: { email: `coach+${Date.now()}@gymstack.local`, password: staffPassword, role: Role.USER, status: UserStatus.ACTIVE, orgId: tenantId, subscriptionStatus: SubscriptionStatus.TRIAL, emailVerifiedAt: new Date() },
    });
    await tx.membership.create({ data: { orgId: tenantId, userId: staff.id, gymId: locationId, role: MembershipRole.GYM_STAFF_COACH, status: MembershipStatus.ACTIVE } });

    const plan = await tx.membershipPlan.create({ data: { locationId, name: 'Unlimited Demo', interval: 'month', priceCents: 8900, description: 'Full access plan' } });

    const clients = await Promise.all(Array.from({ length: 4 }).map((_, index) => tx.user.create({
      data: { email: `demo-client-${index + 1}-${Date.now()}@gymstack.local`, password: staffPassword, role: Role.USER, status: UserStatus.ACTIVE, orgId: tenantId, subscriptionStatus: SubscriptionStatus.TRIAL, emailVerifiedAt: new Date() },
    })));

    for (const client of clients) {
      await tx.membership.create({ data: { orgId: tenantId, userId: client.id, gymId: locationId, role: MembershipRole.CLIENT, status: MembershipStatus.ACTIVE } });
      await tx.clientMembership.create({ data: { userId: client.id, locationId, planId: plan.id, status: 'active', startAt: new Date(), createdByUserId: ownerId } });
    }

    const classTemplate = await tx.class.create({ data: { locationId, title: 'HIIT Demo Session', capacity: 20, coachUserId: staff.id, description: 'High energy demo class' } });
    const start = new Date();
    start.setHours(start.getHours() + 2);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const session = await tx.classSession.create({ data: { classId: classTemplate.id, locationId, startsAt: start, endsAt: end } });

    for (const client of clients.slice(0, 3)) {
      await tx.classBooking.create({ data: { sessionId: session.id, locationId, userId: client.id } });
    }
  }

  async accessDemo() {
    const tenant = await this.ensureDemoTenant();
    const ownerMembership = await this.prisma.membership.findFirst({
      where: { orgId: tenant.id, role: MembershipRole.TENANT_OWNER, status: MembershipStatus.ACTIVE },
      include: { user: true },
    });
    if (!ownerMembership) throw new ForbiddenException('Demo owner not found');
    const accessToken = await this.authService.issueAccessTokenForUser(ownerMembership.userId);
    return { accessToken, demoTenantId: tenant.id };
  }

  async resetDemoData(userId: string, tenantId?: string) {
    const targetTenant = tenantId ?? (await this.prisma.user.findUnique({ where: { id: userId }, select: { orgId: true } }))?.orgId;
    if (!targetTenant) throw new ForbiddenException('Tenant context required');

    const org = await this.prisma.organization.findUnique({ where: { id: targetTenant }, select: { isDemo: true } });
    if (!org?.isDemo) throw new ForbiddenException('Reset is allowed only for demo tenants');

    await this.prisma.$transaction(async (tx) => {
      const locationIds = (await tx.gym.findMany({ where: { orgId: targetTenant }, select: { id: true } })).map((location) => location.id);
      await tx.classBooking.deleteMany({ where: { locationId: { in: locationIds } } });
      await tx.classSession.deleteMany({ where: { locationId: { in: locationIds } } });
      await tx.class.deleteMany({ where: { locationId: { in: locationIds } } });
      await tx.clientMembership.deleteMany({ where: { locationId: { in: locationIds } } });
      await tx.membershipPlan.deleteMany({ where: { locationId: { in: locationIds } } });
      await tx.membership.deleteMany({ where: { orgId: targetTenant, role: { in: [MembershipRole.GYM_STAFF_COACH, MembershipRole.CLIENT, MembershipRole.TENANT_LOCATION_ADMIN] } } });
      await tx.user.deleteMany({ where: { orgId: targetTenant, email: { contains: '@gymstack.local' }, NOT: { email: 'demo-owner@gymstack.local' } } });
      const owner = await tx.membership.findFirst({ where: { orgId: targetTenant, role: MembershipRole.TENANT_OWNER }, select: { userId: true } });
      if (locationIds.length > 0 && owner?.userId) {
        await this.seedDemoData(tx, targetTenant, locationIds[0], owner.userId);
      }
      await tx.organization.update({ where: { id: targetTenant }, data: { demoLastResetAt: new Date() } });
    });

    return { ok: true as const };
  }
}
