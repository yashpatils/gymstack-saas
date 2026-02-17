import { ForbiddenException, Injectable } from '@nestjs/common';
import { MembershipRole, MembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const STAFF_ROLES: MembershipRole[] = [MembershipRole.TENANT_LOCATION_ADMIN, MembershipRole.GYM_STAFF_COACH];

@Injectable()
export class LocationAppService {
  constructor(private readonly prisma: PrismaService) {}

  assertStaffRole(role: MembershipRole | undefined): void {
    if (!role || !STAFF_ROLES.includes(role)) {
      throw new ForbiddenException('Access restricted to staff roles.');
    }
  }

  assertClientRole(role: MembershipRole | undefined): void {
    if (role !== MembershipRole.CLIENT) {
      throw new ForbiddenException('Access restricted to clients.');
    }
  }

  async getLocationMembers(tenantId: string, locationId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: {
        orgId: tenantId,
        gymId: locationId,
        role: MembershipRole.CLIENT,
        status: MembershipStatus.ACTIVE,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return memberships.map((membership) => ({
      memberId: membership.user.id,
      email: membership.user.email,
      joinedAt: membership.createdAt.toISOString(),
      membershipId: membership.id,
    }));
  }

  async createCheckIn(tenantId: string, locationId: string, memberId: string, actorUserId: string) {
    const member = await this.prisma.membership.findFirst({
      where: {
        userId: memberId,
        orgId: tenantId,
        gymId: locationId,
        status: MembershipStatus.ACTIVE,
        role: MembershipRole.CLIENT,
      },
      select: { id: true },
    });

    if (!member) {
      throw new ForbiddenException('Member not found in active location.');
    }

    const created = await this.prisma.auditLog.create({
      data: {
        orgId: tenantId,
        userId: actorUserId,
        action: 'location_member_check_in',
        entityType: 'attendance',
        entityId: memberId,
        metadata: {
          locationId,
          memberId,
          checkedInAt: new Date().toISOString(),
        } as Prisma.JsonObject,
      },
      select: {
        id: true,
        createdAt: true,
        metadata: true,
      },
    });

    return {
      id: created.id,
      checkedInAt: created.createdAt.toISOString(),
      locationId,
      memberId,
      metadata: created.metadata,
    };
  }

  async getTodayAttendance(tenantId: string, locationId: string) {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const rows = await this.prisma.auditLog.findMany({
      where: {
        orgId: tenantId,
        action: 'location_member_check_in',
        createdAt: { gte: start },
        metadata: {
          path: ['locationId'],
          equals: locationId,
        },
      },
      select: {
        id: true,
        createdAt: true,
        entityId: true,
        metadata: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => ({
      id: row.id,
      checkedInAt: row.createdAt.toISOString(),
      memberId: row.entityId,
      metadata: row.metadata,
    }));
  }

  async getClientAttendance(tenantId: string, locationId: string, clientUserId: string) {
    const rows = await this.prisma.auditLog.findMany({
      where: {
        orgId: tenantId,
        action: 'location_member_check_in',
        entityId: clientUserId,
        metadata: {
          path: ['locationId'],
          equals: locationId,
        },
      },
      select: {
        id: true,
        createdAt: true,
        metadata: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => ({
      id: row.id,
      checkedInAt: row.createdAt.toISOString(),
      metadata: row.metadata,
    }));
  }
}
