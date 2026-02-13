import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole, Prisma, Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { SubscriptionGatingService } from '../billing/subscription-gating.service';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole } from '../users/user.model';
import { UpdateGymDto } from './dto/update-gym.dto';

@Injectable()
export class GymsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionGatingService: SubscriptionGatingService,
    private readonly auditService: AuditService,
  ) {}

  listGyms(orgId: string) {
    return this.prisma.gym.findMany({
      where: { orgId },
    });
  }

  async createGym(orgId: string, ownerId: string, name: string) {
    const gym = await this.prisma.gym.create({
      data: {
        name,
        owner: { connect: { id: ownerId } },
        org: { connect: { id: orgId } },
      },
    });

    await this.auditService.log({
      orgId,
      userId: ownerId,
      action: 'gym.create',
      entityType: 'gym',
      entityId: gym.id,
      metadata: { name: gym.name },
    });

    return gym;
  }

  async createGymForUser(user: User, name: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });

    if (memberships.length === 0) {
      const createdGym = await this.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: { name: `${name} Organization` },
        });

        await tx.membership.create({
          data: {
            orgId: organization.id,
            userId: user.id,
            role: MembershipRole.OWNER,
          },
        });

        await tx.user.update({
          where: { id: user.id },
          data: {
            orgId: organization.id,
            role: Role.OWNER,
          },
        });

        return tx.gym.create({
          data: {
            name,
            owner: { connect: { id: user.id } },
            org: { connect: { id: organization.id } },
          },
        });
      });

      await this.auditService.log({
        orgId: createdGym.orgId,
        userId: user.id,
        action: 'gym.create',
        entityType: 'gym',
        entityId: createdGym.id,
        metadata: { name: createdGym.name, onboarding: true },
      });

      return createdGym;
    }

    if (![UserRole.Owner, UserRole.Admin].includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const orgId = user.orgId || memberships[0]?.orgId;
    if (!orgId) {
      throw new ForbiddenException('Missing tenant context');
    }

    return this.createGym(orgId, user.id, name);
  }

  getGym(id: string, orgId: string) {
    return this.prisma.gym.findFirst({ where: { id, orgId } });
  }

  async updateGym(id: string, orgId: string, data: UpdateGymDto) {
    const gym = await this.prisma.gym.findFirst({ where: { id, orgId } });
    if (!gym) {
      throw new NotFoundException('Gym not found');
    }

    const updatedGym = await this.prisma.gym.update({
      where: { id },
      data,
    });

    await this.auditService.log({
      orgId,
      userId: gym.ownerId,
      action: 'gym.update',
      entityType: 'gym',
      entityId: updatedGym.id,
    });

    return updatedGym;
  }

  async deleteGym(id: string, orgId: string) {
    const gym = await this.prisma.gym.findFirst({ where: { id, orgId } });
    if (!gym) {
      throw new NotFoundException('Gym not found');
    }

    const deletedGym = await this.prisma.gym.delete({ where: { id } });

    await this.auditService.log({
      orgId,
      userId: gym.ownerId,
      action: 'gym.delete',
      entityType: 'gym',
      entityId: deletedGym.id,
    });

    return deletedGym;
  }

  async updateGymForUser(
    id: string,
    data: UpdateGymDto,
    user: User,
  ) {
    const gym = await this.prisma.gym.findFirst({ where: { id, orgId: user.orgId } });
    if (!gym) {
      throw new NotFoundException('Gym not found');
    }
    if (user.role !== UserRole.Admin && gym.ownerId !== user.id) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const updatedGym = await this.prisma.gym.update({
      where: { id },
      data,
    });

    await this.auditService.log({
      orgId: user.orgId,
      userId: user.id,
      action: 'gym.update',
      entityType: 'gym',
      entityId: updatedGym.id,
    });

    return updatedGym;
  }

  async deleteGymForUser(id: string, user: User) {
    const gym = await this.prisma.gym.findFirst({ where: { id, orgId: user.orgId } });
    if (!gym) {
      throw new NotFoundException('Gym not found');
    }
    if (user.role !== UserRole.Admin && gym.ownerId !== user.id) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const deletedGym = await this.prisma.gym.delete({ where: { id } });

    await this.auditService.log({
      orgId: user.orgId,
      userId: user.id,
      action: 'gym.delete',
      entityType: 'gym',
      entityId: deletedGym.id,
    });

    return deletedGym;
  }
}
