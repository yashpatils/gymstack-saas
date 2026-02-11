import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole } from './user.model';
import { UpdateUserDto } from './dto/update-user.dto';

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

  listUsers(orgId: string) {
    return this.prisma.user.findMany({
      where: {
        memberships: {
          some: { orgId },
        },
      },
      select: userSelect,
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

  async updateUser(id: string, orgId: string, data: UpdateUserDto) {
    const existing = await this.getUser(id, orgId);
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
  }

  updateUserForRequester(
    id: string,
    orgId: string,
    data: UpdateUserDto,
    requester: User,
  ) {
    const canManageUsers = [UserRole.Admin, UserRole.Owner].includes(requester.role);

    if (!canManageUsers && requester.id !== id) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (!canManageUsers && 'role' in data) {
      throw new ForbiddenException('Insufficient permissions');
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

  getCurrentUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });
  }

  async changeOwnPassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordMatches = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatches) {
      throw new BadRequestException('Unable to update password');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash },
    });

    return { ok: true };
  }
}
