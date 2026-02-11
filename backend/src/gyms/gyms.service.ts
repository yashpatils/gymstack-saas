import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SubscriptionGatingService } from '../billing/subscription-gating.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { User, UserRole } from '../users/user.model';

@Injectable()
export class GymsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionGatingService: SubscriptionGatingService,
    private readonly notificationsService: NotificationsService,
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

    await this.notificationsService.createForUser({
      userId: ownerId,
      type: 'gym.created',
      title: 'Gym created',
      body: `Gym "${gym.name}" was created successfully.`,
    });

    return gym;
  }

  getGym(id: string, orgId: string) {
    return this.prisma.gym.findFirst({ where: { id, orgId } });
  }

  async updateGym(id: string, orgId: string, data: Prisma.GymUpdateInput) {
    const gym = await this.prisma.gym.findFirst({ where: { id, orgId } });
    if (!gym) {
      throw new NotFoundException('Gym not found');
    }

    return this.prisma.gym.update({
      where: { id },
      data,
    });
  }

  async deleteGym(id: string, orgId: string) {
    const gym = await this.prisma.gym.findFirst({ where: { id, orgId } });
    if (!gym) {
      throw new NotFoundException('Gym not found');
    }

    return this.prisma.gym.delete({ where: { id } });
  }

  async updateGymForUser(
    id: string,
    data: Prisma.GymUpdateInput,
    user: User,
  ) {
    const gym = await this.prisma.gym.findFirst({ where: { id, orgId: user.orgId } });
    if (!gym) {
      throw new NotFoundException('Gym not found');
    }
    if (user.role !== UserRole.Admin && gym.ownerId !== user.id) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return this.prisma.gym.update({
      where: { id },
      data,
    });
  }

  async deleteGymForUser(id: string, user: User) {
    const gym = await this.prisma.gym.findFirst({ where: { id, orgId: user.orgId } });
    if (!gym) {
      throw new NotFoundException('Gym not found');
    }
    if (user.role !== UserRole.Admin && gym.ownerId !== user.id) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return this.prisma.gym.delete({ where: { id } });
  }
}
