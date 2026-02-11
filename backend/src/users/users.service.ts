import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole } from './user.model';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  listUsers(orgId: string) {
    return this.prisma.user.findMany({
      where: {
        memberships: {
          some: { orgId },
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  getUser(id: string, orgId: string) {
    return this.prisma.user.findFirst({
      where: {
        id,
        memberships: {
          some: { orgId },
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateUser(id: string, orgId: string, data: Prisma.UserUpdateInput) {
    const existing = await this.getUser(id, orgId);
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        role: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  updateUserForRequester(
    id: string,
    orgId: string,
    data: Prisma.UserUpdateInput,
    requester: User,
  ) {
    if (requester.role !== UserRole.Admin && requester.id !== id) {
      throw new ForbiddenException('Insufficient role');
    }
    if (requester.role !== UserRole.Admin && 'role' in data) {
      throw new ForbiddenException('Insufficient role');
    }
    return this.updateUser(id, orgId, data);
  }

  async deleteUser(id: string, orgId: string) {
    const existing = await this.getUser(id, orgId);
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.delete({ where: { id } });
  }
}
