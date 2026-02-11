import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
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

  async renameOrg(orgId: string, userId: string, name: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId },
    });

    if (!membership || membership.orgId !== orgId) {
      throw new ForbiddenException('Organization access denied');
    }

    if (
      membership.role !== MembershipRole.OWNER
      && membership.role !== MembershipRole.ADMIN
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
