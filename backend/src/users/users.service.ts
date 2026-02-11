import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole } from './user.model';

const userSelect = {
  id: true,
  email: true,
  role: true,
  orgId: true,
  subscriptionStatus: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  listUsers() {
    return this.prisma.user.findMany({
      select: userSelect,
    });
  }

  listUsersForRequester(requester: User) {
    if (requester.role === UserRole.Admin && !requester.orgId) {
      return this.listUsers();
    }

    if (requester.orgId) {
      return this.prisma.user.findMany({
        where: {
          orgId: requester.orgId,
        },
        select: userSelect,
      });
    }

    return this.prisma.user.findMany({
      where: {
        id: requester.id,
      },
      select: userSelect,
    });
  }

  getUser(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
  }

  updateUser(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
  }

  updateUserForRequester(
    id: string,
    data: Prisma.UserUpdateInput,
    requester: User,
  ) {
    if (requester.role !== UserRole.Admin && requester.id !== id) {
      throw new ForbiddenException('Insufficient role');
    }
    if (requester.role !== UserRole.Admin && 'role' in data) {
      throw new ForbiddenException('Insufficient role');
    }
    return this.updateUser(id, data);
  }

  deleteUser(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}
