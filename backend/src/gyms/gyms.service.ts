import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SubscriptionGatingService } from '../billing/subscription-gating.service';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole } from '../users/user.model';

@Injectable()
export class GymsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionGatingService: SubscriptionGatingService,
  ) {}

  listGyms() {
    return this.prisma.gym.findMany();
  }

  async createGymForUser(user: User, data: Prisma.GymCreateInput) {
    if (user.role !== UserRole.Admin) {
      const ownedGymCount = await this.prisma.gym.count({
        where: { ownerId: user.id },
      });

      if (ownedGymCount >= 1) {
        await this.subscriptionGatingService.requireActiveSubscription(user.id);
      }
    }

    return this.prisma.gym.create({ data });
  }

  getGym(id: string) {
    return this.prisma.gym.findUnique({ where: { id } });
  }

  updateGym(id: string, data: Prisma.GymUpdateInput) {
    return this.prisma.gym.update({
      where: { id },
      data,
    });
  }

  deleteGym(id: string) {
    return this.prisma.gym.delete({ where: { id } });
  }

  async updateGymForUser(
    id: string,
    data: Prisma.GymUpdateInput,
    user: User,
  ) {
    const gym = await this.prisma.gym.findUnique({ where: { id } });
    if (!gym) {
      throw new NotFoundException('Gym not found');
    }
    if (user.role !== UserRole.Admin && gym.ownerId !== user.id) {
      throw new ForbiddenException('Insufficient role');
    }
    return this.prisma.gym.update({
      where: { id },
      data,
    });
  }

  async deleteGymForUser(id: string, user: User) {
    const gym = await this.prisma.gym.findUnique({ where: { id } });
    if (!gym) {
      throw new NotFoundException('Gym not found');
    }
    if (user.role !== UserRole.Admin && gym.ownerId !== user.id) {
      throw new ForbiddenException('Insufficient role');
    }
    return this.prisma.gym.delete({ where: { id } });
  }
}
