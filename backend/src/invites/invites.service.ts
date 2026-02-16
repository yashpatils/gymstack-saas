import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { DomainStatus, InviteStatus, MembershipRole, MembershipStatus, type LocationInvite } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole } from '../users/user.model';
import { CreateInviteDto } from './dto/create-invite.dto';
import { assertCanCreateLocationInvite } from './invite-permissions';
import { hasSupportModeContext } from '../auth/support-mode.util';

@Injectable()
export class InvitesService {
  constructor(private readonly prisma: PrismaService) {}

  async createInvite(requester: User, input: CreateInviteDto) {
    const tenantId = requester.activeTenantId ?? requester.orgId;
    if (!tenantId) throw new ForbiddenException('Missing tenant context');

    if (input.role !== MembershipRole.GYM_STAFF_COACH && input.role !== MembershipRole.CLIENT) {
      throw new ForbiddenException('Unsupported invite role');
    }

    const location = await this.prisma.gym.findFirst({ where: { id: input.locationId, orgId: tenantId } });
    if (!location) throw new BadRequestException('Invalid locationId');

    await this.assertCanCreateInvite(requester, tenantId, input.locationId, input.role);

    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + (input.expiresInHours ?? 168) * 60 * 60 * 1000);

    await this.prisma.locationInvite.create({
      data: {
        tenantId,
        locationId: location.id,
        role: input.role,
        email: input.email?.toLowerCase() ?? null,
        tokenHash,
        tokenPrefix: token.slice(0, 6),
        expiresAt,
        createdByUserId: requester.id,
        status: InviteStatus.PENDING,
      },
    });

    return {
      token,
      inviteUrl: await this.buildInviteLink(token, location.id, location.slug),
      role: input.role,
      tenantId,
      locationId: location.id,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async validateInvite(token: string): Promise<
    | { ok: true; role: MembershipRole; locationId: string; tenantId: string; locationName?: string; locationSlug?: string; expiresAt: string; targeted: boolean }
    | { ok: false; reason: 'INVALID' | 'EXPIRED' | 'ALREADY_USED' | 'REVOKED' }
  > {
    const invite = await this.findByToken(token);
    if (!invite) {
      return { ok: false, reason: 'INVALID' };
    }

    if (invite.status === InviteStatus.REVOKED) {
      return { ok: false, reason: 'REVOKED' };
    }

    if (invite.status === InviteStatus.ACCEPTED || invite.consumedAt) {
      return { ok: false, reason: 'ALREADY_USED' };
    }

    if (invite.status !== InviteStatus.PENDING || invite.expiresAt.getTime() < Date.now()) {
      return { ok: false, reason: 'EXPIRED' };
    }

    const location = await this.prisma.gym.findUnique({ where: { id: invite.locationId }, select: { name: true, slug: true } });

    return {
      ok: true,
      role: invite.role,
      locationId: invite.locationId,
      tenantId: invite.tenantId,
      locationName: location?.name,
      locationSlug: location?.slug,
      expiresAt: invite.expiresAt.toISOString(),
      targeted: Boolean(invite.email),
    };
  }

  async getUsableInvite(token: string, expectedEmail?: string): Promise<LocationInvite | null> {
    const invite = await this.findByToken(token);
    if (!invite || invite.status !== InviteStatus.PENDING || invite.expiresAt.getTime() < Date.now() || invite.consumedAt) {
      return null;
    }

    if (expectedEmail && invite.email && invite.email.toLowerCase() !== expectedEmail.toLowerCase()) {
      return null;
    }

    return invite;
  }

  async consumeInvite(inviteId: string): Promise<void> {
    await this.prisma.locationInvite.update({
      where: { id: inviteId },
      data: { status: InviteStatus.ACCEPTED, consumedAt: new Date() },
    });
  }


  async consumeByToken(token: string, expectedEmail?: string): Promise<{ ok: true; inviteId: string; role: MembershipRole; tenantId: string; locationId: string }> {
    const invite = await this.getUsableInvite(token, expectedEmail);
    if (!invite) {
      throw new BadRequestException('Invalid or expired invite token');
    }

    await this.consumeInvite(invite.id);
    return { ok: true, inviteId: invite.id, role: invite.role, tenantId: invite.tenantId, locationId: invite.locationId };
  }

  async listInvites(requester: User, locationId?: string): Promise<Array<{ id: string; role: MembershipRole; email: string | null; status: InviteStatus; tokenPrefix: string; expiresAt: string; consumedAt: string | null; createdAt: string }>> {
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

    await this.prisma.locationInvite.update({ where: { id: inviteId }, data: { status: InviteStatus.REVOKED } });
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
