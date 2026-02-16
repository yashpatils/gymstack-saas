import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InviteStatus, MembershipRole, MembershipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

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
      },
    });
  }
}
