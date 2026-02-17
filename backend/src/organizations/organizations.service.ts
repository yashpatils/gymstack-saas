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
