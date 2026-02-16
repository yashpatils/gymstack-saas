import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InviteStatus, MembershipRole, MembershipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardSummary(orgId: string, userId: string): Promise<{ locations: number; members: number; mrr: null; invites: number }> {
    const membership = await this.prisma.membership.findFirst({
      where: { userId, orgId, status: MembershipStatus.ACTIVE },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const [locations, members, invites] = await Promise.all([
      this.prisma.gym.count({ where: { orgId } }),
      this.prisma.membership.count({ where: { orgId, status: MembershipStatus.ACTIVE } }),
      this.prisma.locationInvite.count({ where: { tenantId: orgId, status: InviteStatus.PENDING } }),
    ]);

    return {
      locations,
      members,
      mrr: null,
      invites,
    };
  }

  async getOrg(orgId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async renameOrg(orgId: string, userId: string, name: string) {
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
      },
    });
  }
}
