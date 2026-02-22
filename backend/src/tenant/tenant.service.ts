import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { AuditActorType, InviteStatus, MembershipRole, MembershipStatus, PendingChangeTargetType, PendingChangeType } from '@prisma/client';
import { createHash, randomInt } from 'crypto';
import { InvitesService } from '../invites/invites.service';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '../users/user.model';
import { CreateInviteDto } from '../invites/dto/create-invite.dto';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { UpdateMemberDto } from './dto/update-member.dto';
import { SecurityErrors } from '../common/errors/security-errors';
import { validateTenantSlug } from '../common/slug.util';
import { SlugAvailabilityQueryDto, SlugAvailabilityResponseDto } from './dto/slug-availability.dto';
import { RequestTenantSlugChangeDto, RequestTenantSlugChangeResponseDto } from './dto/request-tenant-slug-change.dto';
import { VerifyTenantSlugChangeDto, VerifyTenantSlugChangeResponseDto } from './dto/verify-tenant-slug-change.dto';
import { ResendTenantSlugChangeOtpDto, ResendTenantSlugChangeOtpResponseDto } from './dto/resend-tenant-slug-change.dto';

export type RequestContextMeta = {
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class TenantService {
  private static readonly OTP_EXPIRY_SECONDS = 10 * 60;
  private static readonly RESEND_COOLDOWN_SECONDS = 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly invitesService: InvitesService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
  ) {}

  private generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  private hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  }

  private async requireOwnerMembership(requesterId: string, tenantId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { userId: requesterId, orgId: tenantId, role: MembershipRole.TENANT_OWNER, status: MembershipStatus.ACTIVE },
      select: { id: true },
    });
    if (!membership) {
      throw SecurityErrors.forbidden();
    }
  }

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

  async checkSlugAvailability(requester: User, slugRaw: string): Promise<{ slug: string; available: boolean; reserved: boolean; validFormat: boolean; reason?: string }> {
    const tenantId = requester.activeTenantId ?? requester.orgId;
    if (!tenantId) {
      throw new ForbiddenException('Missing tenant context');
    }

    const validation = validateTenantSlug(slugRaw ?? '');
    if (!validation.ok) {
      return {
        slug: (slugRaw ?? '').trim().toLowerCase(),
        available: false,
        reserved: validation.reason.toLowerCase().includes('reserved'),
        validFormat: false,
        reason: validation.reason,
      };
    }

    const existing = await this.prisma.gym.findUnique({ where: { slug: validation.slug }, select: { id: true, orgId: true } });
    const available = !existing || existing.orgId === tenantId;

    return {
      slug: validation.slug,
      available,
      reserved: false,
      validFormat: true,
      reason: available ? undefined : 'This slug is already in use',
    };
  }

  async getSlugAvailability(requesterUserId: string, query: SlugAvailabilityQueryDto): Promise<SlugAvailabilityResponseDto> {
    const requester = await this.prisma.user.findUnique({ where: { id: requesterUserId } });
    if (!requester) {
      throw new ForbiddenException('Missing user');
    }

    return this.checkSlugAvailability(requester as User, query.slug);
  }

  async requestTenantSlugChange(
    requester: { id: string; email: string },
    tenantId: string,
    dto: RequestTenantSlugChangeDto,
    meta: RequestContextMeta,
  ): Promise<RequestTenantSlugChangeResponseDto> {
    await this.requireOwnerMembership(requester.id, tenantId);

    const validation = validateTenantSlug(dto.newSlug ?? '');
    if (!validation.ok) {
      if (validation.reason.toLowerCase().includes('reserved')) {
        throw SecurityErrors.slugReserved();
      }
      throw SecurityErrors.slugInvalid(validation.reason);
    }

    const normalizedSlug = validation.slug;
    const location = await this.prisma.gym.findFirst({
      where: { orgId: tenantId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, slug: true },
    });
    if (!location) {
      throw new BadRequestException('No location found for this tenant');
    }

    if (location.slug === normalizedSlug) {
      throw new BadRequestException('This slug is already active');
    }

    const existing = await this.prisma.gym.findUnique({ where: { slug: normalizedSlug }, select: { id: true } });
    if (existing && existing.id !== location.id) {
      throw SecurityErrors.slugTaken();
    }

    const now = new Date();
    const otp = this.generateOtp();
    const expiresAt = new Date(now.getTime() + TenantService.OTP_EXPIRY_SECONDS * 1000);
    const resendAvailableAt = new Date(now.getTime() + TenantService.RESEND_COOLDOWN_SECONDS * 1000);

    await this.prisma.pendingSensitiveChange.updateMany({
      where: {
        userId: requester.id,
        tenantId,
        changeType: PendingChangeType.TENANT_SLUG,
        consumedAt: null,
        cancelledAt: null,
      },
      data: { cancelledAt: now },
    });

    const challenge = await this.prisma.pendingSensitiveChange.create({
      data: {
        userId: requester.id,
        tenantId,
        targetType: PendingChangeTargetType.TENANT_SETTINGS,
        changeType: PendingChangeType.TENANT_SLUG,
        payloadJson: { gymId: location.id, oldSlug: location.slug, newSlug: normalizedSlug },
        otpHash: this.hashOtp(otp),
        otpExpiresAt: expiresAt,
        resendAvailableAt,
        lastSentAt: now,
        requestedFromIp: meta.ip,
        requestedUserAgent: meta.userAgent,
      },
    });

    await this.emailService.sendTemplatedActionEmail({
      to: requester.email,
      template: 'tenant_slug_change_otp',
      subject: 'Confirm your Gymstack slug change',
      title: 'Confirm slug change',
      intro: `Use this one-time code to confirm your new slug: ${otp}. It expires in ${Math.floor(TenantService.OTP_EXPIRY_SECONDS / 60)} minutes.`,
      buttonLabel: 'Open settings',
      link: '/platform/settings',
    });

    return {
      challengeId: challenge.id,
      expiresAt: expiresAt.toISOString(),
      resendAvailableAt: resendAvailableAt.toISOString(),
      pendingChangeType: 'TENANT_SLUG',
      normalizedSlug,
    };
  }

  async verifyTenantSlugChange(
    requester: { id: string; email: string },
    tenantId: string,
    dto: VerifyTenantSlugChangeDto,
    _meta: RequestContextMeta,
  ): Promise<VerifyTenantSlugChangeResponseDto> {
    await this.requireOwnerMembership(requester.id, tenantId);
    const challenge = await this.prisma.pendingSensitiveChange.findFirst({
      where: {
        id: dto.challengeId,
        userId: requester.id,
        tenantId,
        changeType: PendingChangeType.TENANT_SLUG,
        consumedAt: null,
        cancelledAt: null,
      },
    });

    if (!challenge) {
      throw SecurityErrors.challengeNotFound();
    }

    const now = new Date();
    if (challenge.otpExpiresAt <= now) {
      throw SecurityErrors.otpExpired();
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      throw SecurityErrors.otpAttemptsExceeded();
    }

    if (this.hashOtp(dto.otp) !== challenge.otpHash) {
      await this.prisma.pendingSensitiveChange.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw SecurityErrors.otpInvalid();
    }

    const payload = challenge.payloadJson as { gymId?: string; oldSlug?: string; newSlug?: string };
    if (!payload?.gymId || !payload?.newSlug || !payload?.oldSlug) {
      throw SecurityErrors.challengeNotFound();
    }

    const changedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      const duplicate = await tx.gym.findUnique({ where: { slug: payload.newSlug! }, select: { id: true } });
      if (duplicate && duplicate.id !== payload.gymId) {
        throw SecurityErrors.slugTaken();
      }

      const location = await tx.gym.findFirst({ where: { id: payload.gymId, orgId: tenantId }, select: { id: true } });
      if (!location) {
        throw SecurityErrors.challengeNotFound();
      }

      await tx.gym.update({ where: { id: payload.gymId }, data: { slug: payload.newSlug } });
      await tx.pendingSensitiveChange.update({ where: { id: challenge.id }, data: { consumedAt: changedAt } });
    });

    return {
      success: true,
      tenantId,
      oldSlug: payload.oldSlug,
      newSlug: payload.newSlug,
      changedAt: changedAt.toISOString(),
    };
  }

  async resendTenantSlugChangeOtp(
    requester: { id: string; email: string },
    tenantId: string,
    dto: ResendTenantSlugChangeOtpDto,
    meta: RequestContextMeta,
  ): Promise<ResendTenantSlugChangeOtpResponseDto> {
    await this.requireOwnerMembership(requester.id, tenantId);
    const challenge = await this.prisma.pendingSensitiveChange.findFirst({
      where: {
        id: dto.challengeId,
        userId: requester.id,
        tenantId,
        changeType: PendingChangeType.TENANT_SLUG,
        consumedAt: null,
        cancelledAt: null,
      },
    });
    if (!challenge) {
      throw SecurityErrors.challengeNotFound();
    }

    const now = new Date();
    if (challenge.resendAvailableAt && challenge.resendAvailableAt > now) {
      const retryAfterSeconds = Math.ceil((challenge.resendAvailableAt.getTime() - now.getTime()) / 1000);
      throw SecurityErrors.rateLimited(retryAfterSeconds);
    }

    if (challenge.otpExpiresAt <= now) {
      throw SecurityErrors.otpExpired();
    }

    const otp = this.generateOtp();
    const expiresAt = new Date(now.getTime() + TenantService.OTP_EXPIRY_SECONDS * 1000);
    const resendAvailableAt = new Date(now.getTime() + TenantService.RESEND_COOLDOWN_SECONDS * 1000);

    await this.prisma.pendingSensitiveChange.update({
      where: { id: challenge.id },
      data: {
        otpHash: this.hashOtp(otp),
        otpExpiresAt: expiresAt,
        resendAvailableAt,
        resendCount: { increment: 1 },
        lastSentAt: now,
        requestedFromIp: meta.ip,
        requestedUserAgent: meta.userAgent,
      },
    });

    await this.emailService.sendTemplatedActionEmail({
      to: requester.email,
      template: 'tenant_slug_change_otp',
      subject: 'Your new Gymstack slug change code',
      title: 'Your new slug confirmation code',
      intro: `Use this one-time code to confirm your new slug: ${otp}. It expires in ${Math.floor(TenantService.OTP_EXPIRY_SECONDS / 60)} minutes.`,
      buttonLabel: 'Open settings',
      link: '/platform/settings',
    });

    return {
      challengeId: challenge.id,
      expiresAt: expiresAt.toISOString(),
      resendAvailableAt: resendAvailableAt.toISOString(),
      resent: true,
    };
  }
}
