import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { DomainStatus, InviteStatus, MembershipRole, MembershipStatus, type LocationInvite } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole } from '../users/user.model';
import { CreateInviteDto } from './dto/create-invite.dto';
import { assertCanCreateLocationInvite } from './invite-permissions';
import { hasSupportModeContext } from '../auth/support-mode.util';
import { EmailService } from '../email/email.service';

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async createInvite(requester: User, input: CreateInviteDto) {
    if (input.role !== MembershipRole.GYM_STAFF_COACH && input.role !== MembershipRole.CLIENT) {
      throw new ForbiddenException('Unsupported invite role');
    }

    const tenantId = input.tenantId;
    const requesterTenantId = requester.activeTenantId ?? requester.orgId;
    if (!requesterTenantId && !hasSupportModeContext(requester, tenantId, input.locationId)) {
      throw new ForbiddenException('Missing tenant context');
    }

    if (requesterTenantId && requesterTenantId !== tenantId && !hasSupportModeContext(requester, tenantId, input.locationId)) {
      throw new ForbiddenException('Insufficient permissions for tenant');
    }

    const location = await this.prisma.gym.findFirst({ where: { id: input.locationId, orgId: tenantId } });
    if (!location) throw new BadRequestException('Invalid locationId');

    await this.assertCanCreateInvite(requester, tenantId, input.locationId, input.role);

    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + (input.expiresInDays ?? 7) * 24 * 60 * 60 * 1000);

    const invite = await this.prisma.locationInvite.create({
      data: {
        tenantId,
        locationId: location.id,
        role: input.role,
        email: input.email?.toLowerCase() ?? null,
        tokenHash,
        tokenPrefix: token.slice(0, 8),
        expiresAt,
        createdByUserId: requester.id,
        status: InviteStatus.PENDING,
      },
    });

    const inviteUrl = await this.buildInviteLink(token, location.id, location.slug);
    if (invite.email) {
      await this.emailService.sendLocationInvite(invite.email, inviteUrl);
    }

    return {
      inviteId: invite.id,
      inviteUrl,
      tokenPrefix: invite.tokenPrefix,
      expiresAt: expiresAt.toISOString(),
      role: input.role,
      tenantId,
      locationId: location.id,
    };
  }

  async validateInvite(token: string): Promise<
    | {
      ok: true;
      valid: true;
      role: MembershipRole;
      locationId: string;
      tenantId: string;
      locationName?: string;
      locationSlug?: string;
      emailBound?: boolean;
      expiresAt: string;
      errorCode?: undefined;
    }
    | { ok: false; valid: false; reason: 'INVALID' | 'EXPIRED' | 'ALREADY_USED' | 'REVOKED'; errorCode: 'invite_invalid' | 'invite_expired' | 'invite_already_used' | 'invite_revoked' }
  > {
    const invite = await this.findByToken(token);
    if (!invite) {
      return { ok: false, valid: false, reason: 'INVALID', errorCode: 'invite_invalid' };
    }

    if (invite.revokedAt || invite.status === InviteStatus.REVOKED) {
      return { ok: false, valid: false, reason: 'REVOKED', errorCode: 'invite_revoked' };
    }

    if (invite.status === InviteStatus.ACCEPTED || invite.consumedAt) {
      return { ok: false, valid: false, reason: 'ALREADY_USED', errorCode: 'invite_already_used' };
    }

    if (invite.expiresAt.getTime() < Date.now()) {
      return { ok: false, valid: false, reason: 'EXPIRED', errorCode: 'invite_expired' };
    }

    const location = await this.prisma.gym.findUnique({ where: { id: invite.locationId }, select: { name: true, slug: true } });

    return {
      ok: true,
      valid: true,
      role: invite.role,
      locationId: invite.locationId,
      tenantId: invite.tenantId,
      locationName: location?.name,
      locationSlug: location?.slug,
      emailBound: Boolean(invite.email),
      expiresAt: invite.expiresAt.toISOString(),
    };
  }

  async getUsableInvite(token: string, expectedEmail?: string): Promise<LocationInvite | null> {
    const invite = await this.findByToken(token);
    if (!invite || invite.expiresAt.getTime() < Date.now() || invite.consumedAt || invite.revokedAt || invite.status !== InviteStatus.PENDING) {
      return null;
    }

    if (expectedEmail && invite.email && invite.email.toLowerCase() !== expectedEmail.toLowerCase()) {
      return null;
    }

    return invite;
  }

  async consumeInvite(inviteId: string, consumedByUserId?: string): Promise<void> {
    const consumed = await this.prisma.locationInvite.updateMany({
      where: {
        id: inviteId,
        consumedAt: null,
        revokedAt: null,
        status: InviteStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      data: {
        status: InviteStatus.ACCEPTED,
        consumedAt: new Date(),
        consumedByUserId: consumedByUserId ?? null,
      },
    });

    if (consumed.count === 0) {
      throw new BadRequestException('Invalid or expired invite token');
    }
  }

  async consumeByToken(token: string, expectedEmail?: string, consumedByUserId?: string): Promise<{ ok: true; inviteId: string; role: MembershipRole; tenantId: string; locationId: string }> {
    const invite = await this.getUsableInvite(token, expectedEmail);
    if (!invite) {
      throw new BadRequestException('Invalid or expired invite token');
    }

    await this.consumeInvite(invite.id, consumedByUserId);
    return { ok: true, inviteId: invite.id, role: invite.role, tenantId: invite.tenantId, locationId: invite.locationId };
  }

  async listInvites(requester: User, locationId?: string): Promise<Array<{ id: string; role: MembershipRole; email: string | null; status: InviteStatus; tokenPrefix: string; expiresAt: string; consumedAt: string | null; consumedByUserId: string | null; revokedAt: string | null; createdAt: string }>> {
    const tenantId = requester.activeTenantId ?? requester.orgId;
    if (!tenantId) {
      throw new ForbiddenException('Missing tenant context');
    }

    const invites = await this.prisma.locationInvite.findMany({
      where: {
        tenantId,
        ...(locationId ? { locationId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return invites.map((invite) => ({
      id: invite.id,
      role: invite.role,
      email: invite.email,
      status: invite.status,
      tokenPrefix: invite.tokenPrefix,
      expiresAt: invite.expiresAt.toISOString(),
      consumedAt: invite.consumedAt ? invite.consumedAt.toISOString() : null,
      consumedByUserId: invite.consumedByUserId ?? null,
      revokedAt: invite.revokedAt ? invite.revokedAt.toISOString() : null,
      createdAt: invite.createdAt.toISOString(),
    }));
  }

  async revokeInvite(requester: User, inviteId: string): Promise<{ ok: true }> {
    const invite = await this.prisma.locationInvite.findUnique({ where: { id: inviteId } });
    if (!invite) {
      throw new BadRequestException('Invite not found');
    }

    const tenantId = requester.activeTenantId ?? requester.orgId;
    if (!tenantId || (tenantId !== invite.tenantId && !hasSupportModeContext(requester, invite.tenantId, invite.locationId))) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const isCreator = invite.createdByUserId === requester.id;
    const requesterIsOwner = await this.prisma.membership.findFirst({
      where: {
        userId: requester.id,
        orgId: tenantId,
        role: { in: [MembershipRole.TENANT_OWNER, MembershipRole.TENANT_LOCATION_ADMIN] },
        status: MembershipStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!isCreator && !requesterIsOwner && !hasSupportModeContext(requester, invite.tenantId, invite.locationId)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    await this.prisma.locationInvite.update({
      where: { id: inviteId },
      data: { status: InviteStatus.REVOKED, revokedAt: new Date() },
    });
    return { ok: true };
  }

  async findByToken(token: string): Promise<LocationInvite | null> {
    return this.prisma.locationInvite.findUnique({ where: { tokenHash: this.hashToken(token) } });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async buildInviteLink(token: string, locationId: string, locationSlug: string): Promise<string> {
    const fallbackBase = process.env.BASE_DOMAIN ?? process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'gymstack.club';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${fallbackBase}`;

    const domain = await this.prisma.customDomain.findFirst({
      where: { locationId, status: DomainStatus.ACTIVE },
      orderBy: { createdAt: 'asc' },
      select: { hostname: true },
    });

    const host = domain?.hostname ?? `${locationSlug}.${fallbackBase}`;
    const protocol = host.includes('localhost') ? 'http' : 'https';

    return `${protocol}://${host}/join?token=${token}`.replace('https://undefined', appUrl.replace(/\/$/, ''));
  }

  private async assertCanCreateInvite(requester: User, tenantId: string, locationId: string, inviteRole: MembershipRole): Promise<void> {
    const isPlatformOperator = [UserRole.Admin, UserRole.Owner].includes(requester.role);
    if (isPlatformOperator) {
      return;
    }

    const memberships = await this.prisma.membership.findMany({
      where: {
        userId: requester.id,
        orgId: tenantId,
        status: MembershipStatus.ACTIVE,
      },
    });

    const ownerMembership = memberships.find((membership) => membership.role === MembershipRole.TENANT_OWNER) ?? null;
    const locationAdminMembership = memberships.find(
      (membership) => membership.role === MembershipRole.TENANT_LOCATION_ADMIN && membership.gymId === locationId,
    ) ?? null;
    const staffMembership = memberships.find(
      (membership) => membership.role === MembershipRole.GYM_STAFF_COACH && membership.gymId === locationId,
    ) ?? null;

    const requesterRole = ownerMembership?.role ?? locationAdminMembership?.role ?? staffMembership?.role;
    if (!requesterRole && !hasSupportModeContext(requester, tenantId, locationId)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (!requesterRole && hasSupportModeContext(requester, tenantId, locationId)) {
      return;
    }

    const resolvedRequesterRole = requesterRole;
    if (!resolvedRequesterRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    assertCanCreateLocationInvite(resolvedRequesterRole, inviteRole, staffMembership);
  }
}
