import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditActorType, MembershipRole, MembershipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ListMessagesDto } from './dto/list-messages.dto';

type RequestUser = {
  id: string;
  email?: string;
  orgId?: string;
  activeTenantId?: string;
  activeGymId?: string;
  supportMode?: {
    tenantId: string;
    locationId?: string;
  };
};

@Injectable()
export class CoachingMessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private resolveContext(user: RequestUser): { tenantId: string; locationId?: string } {
    const tenantId = user.supportMode?.tenantId ?? user.activeTenantId ?? user.orgId;
    const locationId = user.supportMode?.locationId ?? user.activeGymId;

    if (!tenantId) {
      throw new BadRequestException('Active tenant context is required');
    }

    return { tenantId, locationId };
  }

  private async requireAdminAccess(user: RequestUser, tenantId: string, locationId: string): Promise<void> {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: user.id,
        orgId: tenantId,
        status: MembershipStatus.ACTIVE,
        OR: [
          { role: MembershipRole.TENANT_OWNER, gymId: null },
          { role: MembershipRole.TENANT_LOCATION_ADMIN, gymId: locationId },
        ],
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('Admin access required');
    }
  }

  private async requireLocation(locationId: string, tenantId: string): Promise<void> {
    const location = await this.prisma.gym.findFirst({ where: { id: locationId, orgId: tenantId }, select: { id: true } });
    if (!location) {
      throw new NotFoundException('Location not found for active tenant');
    }
  }

  private async verifyRoleMembership(tenantId: string, locationId: string, userId: string, role: MembershipRole): Promise<void> {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        orgId: tenantId,
        gymId: locationId,
        role,
        status: MembershipStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!membership) {
      throw new BadRequestException(`User must have active ${role} membership for this location`);
    }
  }

  private async assertAssignmentAccess(user: RequestUser, assignmentId: string, allowAdmin = false) {
    const { tenantId, locationId } = this.resolveContext(user);
    const assignment = await this.prisma.coachClientAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        coach: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, email: true } },
      },
    });

    if (!assignment || assignment.tenantId !== tenantId) {
      throw new NotFoundException('Assignment not found');
    }

    if (locationId && assignment.locationId !== locationId) {
      throw new ForbiddenException('Assignment is outside active location context');
    }

    const isParticipant = assignment.coachUserId === user.id || assignment.clientUserId === user.id;
    if (isParticipant) {
      return assignment;
    }

    if (!allowAdmin) {
      throw new ForbiddenException('Access denied for this assignment');
    }

    await this.requireAdminAccess(user, tenantId, assignment.locationId);
    return assignment;
  }

  async listAssignments(user: RequestUser) {
    const { tenantId, locationId } = this.resolveContext(user);

    const adminMembership = await this.prisma.membership.findFirst({
      where: {
        userId: user.id,
        orgId: tenantId,
        status: MembershipStatus.ACTIVE,
        OR: [
          { role: MembershipRole.TENANT_OWNER, gymId: null },
          { role: MembershipRole.TENANT_LOCATION_ADMIN, gymId: locationId ?? undefined },
        ],
      },
      select: { id: true },
    });

    const where = {
      tenantId,
      locationId: locationId ?? undefined,
      ...(adminMembership
        ? {}
        : {
            OR: [{ coachUserId: user.id }, { clientUserId: user.id }],
          }),
    };

    return this.prisma.coachClientAssignment.findMany({
      where,
      include: {
        coach: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, email: true } },
        _count: { select: { messages: true } },
      },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAssignment(user: RequestUser, body: CreateAssignmentDto) {
    const { tenantId, locationId } = this.resolveContext(user);
    if (locationId && body.locationId !== locationId) {
      throw new ForbiddenException('Cannot create assignment outside active location');
    }

    await this.requireLocation(body.locationId, tenantId);
    await this.requireAdminAccess(user, tenantId, body.locationId);

    await this.verifyRoleMembership(tenantId, body.locationId, body.coachUserId, MembershipRole.GYM_STAFF_COACH);
    await this.verifyRoleMembership(tenantId, body.locationId, body.clientUserId, MembershipRole.CLIENT);

    if (body.coachUserId === body.clientUserId) {
      throw new BadRequestException('Coach and client cannot be same user');
    }

    const assignment = await this.prisma.coachClientAssignment.create({
      data: {
        tenantId,
        locationId: body.locationId,
        coachUserId: body.coachUserId,
        clientUserId: body.clientUserId,
        createdByUserId: user.id,
      },
      include: {
        coach: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, email: true } },
      },
    });

    this.auditService.log({
      actor: { userId: user.id, email: user.email ?? null, type: AuditActorType.USER },
      tenantId,
      locationId: body.locationId,
      action: 'COACH_CLIENT_ASSIGNMENT_CREATED',
      targetType: 'coach_client_assignment',
      targetId: assignment.id,
      metadata: { coachUserId: body.coachUserId, clientUserId: body.clientUserId },
    });

    return assignment;
  }

  async deleteAssignment(user: RequestUser, assignmentId: string) {
    const assignment = await this.assertAssignmentAccess(user, assignmentId, true);
    await this.prisma.coachClientAssignment.delete({ where: { id: assignment.id } });

    this.auditService.log({
      actor: { userId: user.id, email: user.email ?? null, type: AuditActorType.USER },
      tenantId: assignment.tenantId,
      locationId: assignment.locationId,
      action: 'COACH_CLIENT_ASSIGNMENT_DELETED',
      targetType: 'coach_client_assignment',
      targetId: assignment.id,
    });

    return { success: true };
  }

  async listMessages(user: RequestUser, assignmentId: string, query: ListMessagesDto) {
    await this.assertAssignmentAccess(user, assignmentId, true);

    const limit = query.limit ?? 25;
    const messages = await this.prisma.coachClientMessage.findMany({
      where: {
        assignmentId,
        deletedAt: null,
        ...(query.cursor ? { createdAt: { lt: new Date(query.cursor) } } : {}),
      },
      include: {
        sender: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.createdAt.toISOString() : null,
    };
  }

  async sendMessage(user: RequestUser, assignmentId: string, body: SendMessageDto) {
    const assignment = await this.assertAssignmentAccess(user, assignmentId);

    const created = await this.prisma.$transaction(async (tx) => {
      const message = await tx.coachClientMessage.create({
        data: {
          assignmentId: assignment.id,
          senderUserId: user.id,
          body: body.body.trim(),
        },
        include: {
          sender: { select: { id: true, name: true, email: true } },
        },
      });

      await tx.coachClientAssignment.update({
        where: { id: assignment.id },
        data: { lastMessageAt: message.createdAt },
      });

      return message;
    });

    this.auditService.log({
      actor: { userId: user.id, email: user.email ?? null, type: AuditActorType.USER },
      tenantId: assignment.tenantId,
      locationId: assignment.locationId,
      action: 'COACH_CLIENT_MESSAGE_SENT',
      targetType: 'coach_client_assignment',
      targetId: assignment.id,
      metadata: { messageId: created.id },
    });

    return created;
  }

  async markRead(user: RequestUser, assignmentId: string) {
    const assignment = await this.assertAssignmentAccess(user, assignmentId);
    const now = new Date();

    await this.prisma.coachClientAssignment.update({
      where: { id: assignment.id },
      data: assignment.coachUserId === user.id ? { lastReadAtCoach: now } : { lastReadAtClient: now },
    });

    return { success: true, readAt: now.toISOString() };
  }
}
