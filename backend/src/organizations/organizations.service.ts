import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditActorType, BillingProvider, InviteStatus, MembershipRole, MembershipStatus, Prisma, type NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionGatingService } from '../billing/subscription-gating.service';
import { PlanService } from '../billing/plan.service';
import { BillingLifecycleService } from '../billing/billing-lifecycle.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionGatingService: SubscriptionGatingService,
    private readonly planService: PlanService,
    private readonly billingLifecycleService: BillingLifecycleService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async getOrgMembership(userId: string, orgId: string) {
    return this.prisma.membership.findFirst({
      where: { userId, orgId, status: MembershipStatus.ACTIVE },
      select: { id: true, role: true, orgId: true },
    });
  }

  private async createNotificationStub(input: { tenantId: string; userId: string; title: string; body: string; metadata?: Prisma.InputJsonObject }) {
    try {
      await this.notificationsService.createForUser({
        tenantId: input.tenantId,
        userId: input.userId,
        type: 'SYSTEM' as NotificationType,
        title: input.title,
        body: input.body,
        metadata: input.metadata,
      });
    } catch (error) {
      this.logger.warn(`Notification stub failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async createOrg(user: { id: string; email?: string }, name: string) {
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new BadRequestException('Organization name is required');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({ data: { name: normalizedName } });
      const membership = await tx.membership.create({
        data: { orgId: org.id, userId: user.id, role: MembershipRole.TENANT_OWNER, status: MembershipStatus.ACTIVE },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { orgId: org.id },
      });

      return { org, membership };
    });

    this.auditService.log({
      actor: { userId: user.id, email: user.email ?? null, type: AuditActorType.USER, role: MembershipRole.TENANT_OWNER },
      tenantId: created.org.id,
      action: 'ORG_CREATED',
      targetType: 'organization',
      targetId: created.org.id,
      metadata: { membershipId: created.membership.id },
    });

    await this.createNotificationStub({
      tenantId: created.org.id,
      userId: user.id,
      title: 'Organization created',
      body: `Your organization ${created.org.name} is ready.`,
      metadata: { orgId: created.org.id },
    });

    return { id: created.org.id, name: created.org.name, createdAt: created.org.createdAt.toISOString(), role: MembershipRole.TENANT_OWNER };
  }

  async listUserOrgs(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId, status: MembershipStatus.ACTIVE },
      select: { id: true, role: true, org: { select: { id: true, name: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const seen = new Set<string>();
    return memberships
      .filter((m) => {
        if (seen.has(m.org.id)) return false;
        seen.add(m.org.id);
        return true;
      })
      .map((m) => ({ id: m.org.id, name: m.org.name, createdAt: m.org.createdAt.toISOString(), role: m.role }));
  }

  async getOrgDetailForMember(userId: string, orgId: string) {
    const membership = await this.getOrgMembership(userId, orgId);
    if (!membership) throw new ForbiddenException('Organization access denied');
    return this.getOrg(orgId);
  }

  async updateOrgById(user: { id: string; email?: string }, orgId: string, name: string) {
    const membership = await this.getOrgMembership(user.id, orgId);
    if (!membership) throw new ForbiddenException('Organization access denied');
    if (membership.role !== MembershipRole.TENANT_OWNER && membership.role !== MembershipRole.TENANT_LOCATION_ADMIN) {
      throw new ForbiddenException('Insufficient role');
    }
    const updated = await this.renameOrg(orgId, user.id, name);
    this.auditService.log({ actor: { userId: user.id, email: user.email ?? null, type: AuditActorType.USER, role: membership.role }, tenantId: orgId, action: 'ORG_UPDATED', targetType: 'organization', targetId: orgId, metadata: { name } });
    return updated;
  }

  async listOrgMembers(userId: string, orgId: string) {
    const requester = await this.getOrgMembership(userId, orgId);
    if (!requester || (requester.role !== MembershipRole.TENANT_OWNER && requester.role !== MembershipRole.TENANT_LOCATION_ADMIN)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const members = await this.prisma.membership.findMany({
      where: { orgId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return members.map((m) => ({ id: m.id, userId: m.userId, name: m.user.name, email: m.user.email, role: m.role, status: m.status, createdAt: m.createdAt.toISOString() }));
  }

  async updateOrgMembership(
    actor: { id: string; email?: string },
    orgId: string,
    membershipId: string,
    updates: { role?: MembershipRole; status?: MembershipStatus },
  ) {
    const requester = await this.getOrgMembership(actor.id, orgId);
    if (!requester || (requester.role !== MembershipRole.TENANT_OWNER && requester.role !== MembershipRole.TENANT_LOCATION_ADMIN)) {
      throw new ForbiddenException('Role changes are only allowed by owner/admin');
    }

    const target = await this.prisma.membership.findFirst({ where: { id: membershipId, orgId } });
    if (!target) throw new NotFoundException('Membership not found');

    const updated = await this.prisma.membership.update({ where: { id: target.id }, data: { role: updates.role ?? undefined, status: updates.status ?? undefined } });

    this.auditService.log({
      actor: { userId: actor.id, email: actor.email ?? null, type: AuditActorType.USER, role: requester.role },
      tenantId: orgId,
      action: 'ORG_MEMBERSHIP_UPDATED',
      targetType: 'membership',
      targetId: target.id,
      metadata: { previousRole: target.role, previousStatus: target.status, nextRole: updated.role, nextStatus: updated.status },
    });

    await this.createNotificationStub({
      tenantId: orgId,
      userId: updated.userId,
      title: 'Organization membership updated',
      body: 'Your role or status was updated by an organization administrator.',
      metadata: { membershipId: updated.id, role: updated.role, status: updated.status },
    });

    return { id: updated.id, userId: updated.userId, role: updated.role, status: updated.status };
  }

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
        billingProvider: true,
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
      billingProvider: organization.billingProvider,
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



  async updateWhiteLabel(orgId: string | undefined, userId: string, enabled: boolean, qaBypass = false) {
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

    await this.billingLifecycleService.assertCanToggleWhiteLabel(orgId);

    if (enabled) {
      await this.planService.assertWithinLimits(orgId, 'enableWhiteLabel', { qaBypass });
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
    if (orgId) {
      await this.billingLifecycleService.assertMutableAccess(orgId);
    }
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
        billingProvider: true,
      },
    });
  }

  async updateBillingProvider(
    orgId: string | undefined,
    userId: string,
    billingProvider: BillingProvider,
    billingCountry?: string,
    billingCurrency?: string,
  ) {
    if (!orgId) {
      throw new ForbiddenException('Organization access denied');
    }

    const membership = await this.prisma.membership.findFirst({
      where: { userId, orgId, status: MembershipStatus.ACTIVE },
      select: { role: true },
    });

    if (!membership || membership.role !== MembershipRole.TENANT_OWNER) {
      throw new ForbiddenException('Only tenant owners can change billing provider.');
    }

    return this.prisma.organization.update({
      where: { id: orgId },
      data: {
        billingProvider,
        billingCountry: billingCountry?.toUpperCase(),
        billingCurrency: billingCurrency?.toUpperCase(),
      },
      select: {
        id: true,
        billingProvider: true,
        billingCountry: true,
        billingCurrency: true,
      },
    });
  }
}
