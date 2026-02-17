import { ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InviteStatus, MembershipRole, MembershipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionGatingService } from '../billing/subscription-gating.service';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionGatingService: SubscriptionGatingService,
  ) {}

  async getOrg(orgId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        whiteLabelEnabled: true,
        whiteLabelBrandingEnabled: true,
        stripePriceId: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        isTrialUsed: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const whiteLabelEnabled = this.subscriptionGatingService.getEffectiveWhiteLabel({
      whiteLabelEnabled: Boolean(organization.whiteLabelEnabled || organization.whiteLabelBrandingEnabled),
      stripePriceId: organization.stripePriceId,
      subscriptionStatus: organization.subscriptionStatus,
    });
    const whiteLabelEligible = this.subscriptionGatingService.isWhiteLabelEligible({
      stripePriceId: organization.stripePriceId,
      subscriptionStatus: organization.subscriptionStatus,
    });

    return {
      id: organization.id,
      name: organization.name,
      createdAt: organization.createdAt,
      whiteLabelEnabled,
      whiteLabelEligible,
      trialEndsAt: organization.trialEndsAt,
      isTrialUsed: organization.isTrialUsed,
    };
  }

  async getGrowthStatus(userId: string, orgId: string): Promise<{
    tenantId: string;
    trialEndsAt: string;
    trialDaysLeft: number;
    isTrialExpired: boolean;
    checklist: Array<{ key: string; label: string; completed: boolean; href: string }>;
    completedSteps: number;
    totalSteps: number;
    inactiveDays: 0 | 3 | 7 | 14;
  }> {
    const membership = await this.prisma.membership.findFirst({
      where: { userId, orgId, status: MembershipStatus.ACTIVE },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const [organization, locationCount, staffCount, clientCount, planCount, latestAudit] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: orgId }, select: { createdAt: true, trialEndsAt: true } }),
      this.prisma.gym.count({ where: { orgId } }),
      this.prisma.membership.count({ where: { orgId, role: { in: [MembershipRole.GYM_STAFF_COACH, MembershipRole.TENANT_LOCATION_ADMIN] }, status: MembershipStatus.ACTIVE } }),
      this.prisma.membership.count({ where: { orgId, role: MembershipRole.CLIENT, status: MembershipStatus.ACTIVE } }),
      this.prisma.membershipPlan.count({ where: { location: { orgId } } }),
      this.prisma.auditLog.findFirst({ where: { tenantId: orgId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    ]);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const trialEndsAt = organization.trialEndsAt ?? new Date(organization.createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);
    const trialDaysLeft = Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
    const checklist = [
      { key: 'location', label: 'Create your first location', completed: locationCount > 0, href: '/platform/gyms/new' },
      { key: 'staff', label: 'Add your first staff member', completed: staffCount > 0, href: '/platform/team' },
      { key: 'plan', label: 'Create a membership plan', completed: planCount > 0, href: '/platform/plans' },
      { key: 'client', label: 'Add your first client', completed: clientCount > 0, href: '/platform/users' },
      { key: 'class', label: 'Create your first class', completed: false, href: '/classes' },
      { key: 'booking', label: 'Enable online booking', completed: false, href: '/schedule' },
    ];

    const completedSteps = checklist.filter((step) => step.completed).length;
    const lastActivityAt = latestAudit?.createdAt ?? organization.createdAt;
    const inactiveDaysCount = Math.floor((Date.now() - lastActivityAt.getTime()) / (24 * 60 * 60 * 1000));
    const inactiveDays: 0 | 3 | 7 | 14 = inactiveDaysCount >= 14 ? 14 : inactiveDaysCount >= 7 ? 7 : inactiveDaysCount >= 3 ? 3 : 0;

    return {
      tenantId: orgId,
      trialEndsAt: trialEndsAt.toISOString(),
      trialDaysLeft,
      isTrialExpired: trialDaysLeft <= 0,
      checklist,
      completedSteps,
      totalSteps: checklist.length,
      inactiveDays,
    };
  }


  async getDashboardSummary(userId: string, orgId?: string): Promise<{ locations: number; members: number; mrr: null; invites: number }> {
    if (!orgId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const membership = await this.prisma.membership.findFirst({
      where: { userId, orgId, status: MembershipStatus.ACTIVE },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const [locations, members, invites] = await Promise.all([
      this.prisma.gym.count({ where: { orgId } }),
      this.prisma.membership.count({
        where: {
          orgId,
          status: MembershipStatus.ACTIVE,
          gymId: { not: null },
        },
      }),
      this.prisma.locationInvite.count({
        where: {
          status: InviteStatus.PENDING,
          tenantId: orgId,
        },
      }),
    ]);

    return {
      locations,
      members,
      mrr: null,
      invites,
    };
  }



  async updateWhiteLabel(orgId: string | undefined, userId: string, enabled: boolean) {
    if (!orgId) {
      throw new ForbiddenException('Organization access denied');
    }

    const membership = await this.prisma.membership.findFirst({
      where: { userId, orgId, status: MembershipStatus.ACTIVE },
      select: { role: true },
    });

    if (!membership || membership.role !== MembershipRole.TENANT_OWNER) {
      throw new ForbiddenException('Only tenant owners can update white-label settings');
    }

    if (enabled) {
      const eligible = await this.subscriptionGatingService.getWhiteLabelEligibility(orgId);
      if (!eligible) {
        throw new HttpException({ code: 'UPGRADE_REQUIRED', message: 'Upgrade to Pro to enable white-label.' }, HttpStatus.PAYMENT_REQUIRED);
      }
    }

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: { whiteLabelEnabled: enabled, whiteLabelBrandingEnabled: enabled },
      select: { id: true, whiteLabelEnabled: true },
    });

    return {
      tenantId: updated.id,
      whiteLabelEnabled: updated.whiteLabelEnabled,
    };
  }

  async renameOrg(orgId: string | undefined, userId: string, name: string) {
    if (!orgId) {
      throw new ForbiddenException('Organization access denied');
    }

    const membership = await this.prisma.membership.findFirst({
      where: { userId, orgId },
    });

    if (!membership || membership.orgId !== orgId) {
      throw new ForbiddenException('Organization access denied');
    }

    if (
      membership.role !== MembershipRole.TENANT_OWNER
      && membership.role !== MembershipRole.TENANT_LOCATION_ADMIN
    ) {
      throw new ForbiddenException('Insufficient role');
    }

    return this.prisma.organization.update({
      where: { id: orgId },
      data: { name },
      select: {
        id: true,
        name: true,
        createdAt: true,
        whiteLabelEnabled: true,
        whiteLabelBrandingEnabled: true,
        stripePriceId: true,
        subscriptionStatus: true,
      },
    });
  }
}
