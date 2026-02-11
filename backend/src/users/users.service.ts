import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

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
      select: userSelect,
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

  async updateUserForRequester(
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

    const updatedUser = await this.updateUser(id, orgId, data);

    await this.auditService.log({
      orgId,
      userId: requester.id,
      action: 'user.update',
      entityType: 'user',
      entityId: updatedUser.id,
      metadata: {
        updatedFields: Object.keys(data),
      },
    });

    return updatedUser;
  }

  async deleteUser(id: string, orgId: string, requesterId: string) {
    const existing = await this.getUser(id, orgId);
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const deletedUser = await this.prisma.user.delete({ where: { id } });

    await this.auditService.log({
      orgId,
      userId: requesterId,
      action: 'user.delete',
      entityType: 'user',
      entityId: deletedUser.id,
      metadata: { email: deletedUser.email },
    });

    return deletedUser;
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
