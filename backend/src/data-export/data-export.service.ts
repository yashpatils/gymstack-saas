import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditActorType, MembershipRole, MembershipStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DataExportService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async exportTenantForOwner(userId: string) {
    const ownerMembership = await this.prisma.membership.findFirst({
      where: { userId, role: MembershipRole.TENANT_OWNER, status: MembershipStatus.ACTIVE },
      select: { orgId: true },
    });
    if (!ownerMembership) {
      throw new ForbiddenException('Tenant owner access required');
    }

    return this.exportTenant(ownerMembership.orgId, userId, 'export.tenant.owner');
  }

  async exportLocationForAdmin(userId: string, locationId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        gymId: locationId,
        role: { in: [MembershipRole.TENANT_LOCATION_ADMIN, MembershipRole.TENANT_OWNER] },
        status: MembershipStatus.ACTIVE,
      },
      select: { orgId: true },
    });

    if (!membership) {
      throw new ForbiddenException('Location admin access required');
    }

    return this.exportTenant(membership.orgId, userId, 'export.location.admin', locationId);
  }

  async exportTenantForPlatformAdmin(actorUserId: string, tenantId: string) {
    return this.exportTenant(tenantId, actorUserId, 'export.tenant.platform_admin');
  }

  private async exportTenant(tenantId: string, actorUserId: string, action: string, locationId?: string) {
    const tenant = await this.prisma.organization.findUnique({ where: { id: tenantId }, select: { id: true, name: true, createdAt: true, updatedAt: true } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const whereLocation = locationId ? { id: locationId, orgId: tenantId } : { orgId: tenantId };

    const [locations, plans, memberships, clientMemberships] = await Promise.all([
      this.prisma.gym.findMany({ where: whereLocation, orderBy: { createdAt: 'asc' } }),
      this.prisma.membershipPlan.findMany({ where: locationId ? { locationId } : { location: { orgId: tenantId } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.membership.findMany({
        where: locationId ? { orgId: tenantId, gymId: locationId } : { orgId: tenantId },
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, email: true, role: true, status: true, createdAt: true } } },
      }),
      this.prisma.clientMembership.findMany({
        where: locationId ? { locationId } : { location: { orgId: tenantId } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      tenant,
      scope: { tenantId, locationId: locationId ?? null },
      locations,
      membershipPlans: plans,
      memberships,
      clientMemberships,
      classes: [],
      sessions: [],
      bookings: [],
      attendance: [],
      users: memberships.map((membership) => membership.user),
    };

    await this.audit.log({
      actor: { userId: actorUserId, type: AuditActorType.USER },
      tenantId,
      locationId: locationId ?? null,
      action,
      targetType: 'tenant_export',
      targetId: tenantId,
      metadata: { locationId: locationId ?? null, records: { locations: locations.length, plans: plans.length, memberships: memberships.length, clientMemberships: clientMemberships.length } },
    });

    return exportPayload;
  }
}
