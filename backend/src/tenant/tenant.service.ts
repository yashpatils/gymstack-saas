import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { AuditActorType, InviteStatus, MembershipRole, MembershipStatus } from '@prisma/client';
import { InvitesService } from '../invites/invites.service';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '../users/user.model';
import { CreateInviteDto } from '../invites/dto/create-invite.dto';
import { AuditService } from '../audit/audit.service';
import { UpdateMemberDto } from './dto/update-member.dto';

@Injectable()
export class TenantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invitesService: InvitesService,
    private readonly auditService: AuditService,
  ) {}

  private async requireTenantRole(requester: User, tenantId: string) {
    const memberships = await this.prisma.membership.findMany({ where: { userId: requester.id, orgId: tenantId, status: MembershipStatus.ACTIVE } });
    const owner = memberships.find((m) => m.role === MembershipRole.TENANT_OWNER);
    const manager = memberships.find((m) => m.role === MembershipRole.TENANT_LOCATION_ADMIN);
    const staff = memberships.find((m) => m.role === MembershipRole.GYM_STAFF_COACH);
    return owner?.role ?? manager?.role ?? staff?.role ?? null;
  }

  async listMembers(requester: User) {
    const tenantId = requester.activeTenantId ?? requester.orgId;
    if (!tenantId) throw new ForbiddenException('Missing tenant context');

    const role = await this.requireTenantRole(requester, tenantId);
    if (!role) throw new ForbiddenException('Insufficient permissions');

    const members = await this.prisma.membership.findMany({
      where: { orgId: tenantId },
      include: { user: { select: { id: true, email: true } }, gym: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email,
      name: null,
      role: m.role,
      status: m.status,
      locationId: m.gymId,
      locationName: m.gym?.name ?? null,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async updateMember(requester: User, memberId: string, body: UpdateMemberDto) {
    const tenantId = requester.activeTenantId ?? requester.orgId;
    if (!tenantId) throw new ForbiddenException('Missing tenant context');

    const requesterRole = await this.requireTenantRole(requester, tenantId);
    if (requesterRole !== MembershipRole.TENANT_OWNER) {
      throw new ForbiddenException('Only tenant owner can update team members');
    }

    const member = await this.prisma.membership.findFirst({ where: { id: memberId, orgId: tenantId } });
    if (!member) throw new BadRequestException('Member not found');

    if (body.remove) {
      await this.prisma.membership.delete({ where: { id: member.id } });
      this.auditService.log({ actor: { userId: requester.id, type: AuditActorType.USER, email: requester.email, role: requesterRole }, tenantId, locationId: member.gymId, action: 'MEMBER_REMOVED', targetType: 'membership', targetId: member.id, metadata: { removedUserId: member.userId, removedRole: member.role } });
      return { ok: true };
    }

    const updated = await this.prisma.membership.update({ where: { id: member.id }, data: { role: body.role ?? undefined, gymId: body.locationId ?? undefined } });

    if (body.role && body.role !== member.role) {
      this.auditService.log({ actor: { userId: requester.id, type: AuditActorType.USER, email: requester.email, role: requesterRole }, tenantId, locationId: updated.gymId, action: 'ROLE_CHANGED', targetType: 'membership', targetId: updated.id, metadata: { previousRole: member.role, nextRole: body.role } });
    }

    if (typeof body.locationId !== 'undefined' && body.locationId !== member.gymId) {
      this.auditService.log({ actor: { userId: requester.id, type: AuditActorType.USER, email: requester.email, role: requesterRole }, tenantId, locationId: body.locationId, action: 'LOCATION_SCOPE_CHANGED', targetType: 'membership', targetId: updated.id, metadata: { previousLocationId: member.gymId, nextLocationId: body.locationId ?? null } });
    }

    return { ok: true };
  }

  async listInvites(requester: User) {
    return this.invitesService.listInvites(requester);
  }

  async createInvite(requester: User, payload: CreateInviteDto) {
    const result = await this.invitesService.createInvite(requester, payload);
    this.auditService.log({ actor: { userId: requester.id, type: AuditActorType.USER, email: requester.email, role: requester.activeRole }, tenantId: payload.tenantId, locationId: payload.locationId ?? null, action: 'INVITE_CREATED', targetType: 'invite', targetId: result.inviteId, metadata: { role: payload.role, email: payload.email ?? null } });
    return { inviteLink: result.inviteUrl };
  }

  async revokeInvite(requester: User, inviteId: string) {
    const invite = await this.prisma.locationInvite.findUnique({ where: { id: inviteId } });
    if (!invite) throw new BadRequestException('Invite not found');
    const result = await this.invitesService.revokeInvite(requester, inviteId);
    this.auditService.log({ actor: { userId: requester.id, type: AuditActorType.USER, email: requester.email, role: requester.activeRole }, tenantId: invite.tenantId, locationId: invite.locationId, action: 'INVITE_REVOKED', targetType: 'invite', targetId: inviteId, metadata: { role: invite.role } });
    return result;
  }

  async consumeInvite(token: string, userId: string | undefined, email?: string) {
    const result = await this.invitesService.consumeByToken(token, email, userId);
    const invite = await this.prisma.locationInvite.findUnique({ where: { id: result.inviteId } });
    if (invite) {
      this.auditService.log({ actor: { userId: userId ?? null, type: userId ? AuditActorType.USER : AuditActorType.SYSTEM, email: email ?? null }, tenantId: invite.tenantId, locationId: invite.locationId, action: 'INVITE_CONSUMED', targetType: 'invite', targetId: invite.id, metadata: { role: invite.role, consumedByUserId: userId ?? null } });
    }
    return { ok: true, role: result.role, tenantId: result.tenantId, locationId: result.locationId || null };
  }
}
