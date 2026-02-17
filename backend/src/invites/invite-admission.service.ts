import { BadRequestException, Injectable } from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InvitesService } from './invites.service';

@Injectable()
export class InviteAdmissionService {
  constructor(
    private readonly invitesService: InvitesService,
    private readonly prisma: PrismaService,
  ) {}

  async admitWithInvite(input: { token: string; userId: string; emailFromProviderOrSignup: string | null }): Promise<{ tenantId: string; locationId: string; role: 'GYM_STAFF_COACH' | 'CLIENT' }> {
    if (!input.emailFromProviderOrSignup) {
      throw new BadRequestException('Invite required to join this gym.');
    }
    const normalizedEmail = input.emailFromProviderOrSignup.toLowerCase();
    const inviteByToken = await this.invitesService.findByToken(input.token);
    if (!inviteByToken) {
      throw new BadRequestException('Invite token is invalid.');
    }

    if (inviteByToken.revokedAt || inviteByToken.status === 'REVOKED') {
      throw new BadRequestException('Invite has been revoked.');
    }

    if (inviteByToken.consumedAt || inviteByToken.status === 'ACCEPTED') {
      throw new BadRequestException('Invite already used.');
    }

    if (inviteByToken.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invite expired.');
    }

    if (inviteByToken.email && inviteByToken.email.toLowerCase() !== normalizedEmail) {
      throw new BadRequestException('Invite email does not match this account.');
    }

    const invite = await this.invitesService.getUsableInvite(input.token, normalizedEmail);
    if (!invite) {
      throw new BadRequestException('Invite required to join this gym.');
    }

    if (invite.role !== 'GYM_STAFF_COACH' && invite.role !== 'CLIENT') {
      throw new BadRequestException('Invite required to join this gym.');
    }

    if (!invite.locationId) {
      throw new BadRequestException('Invite is missing location scope.');
    }

    await this.prisma.membership.upsert({
      where: {
        userId_orgId_gymId_role: {
          userId: input.userId,
          orgId: invite.tenantId,
          gymId: invite.locationId,
          role: invite.role,
        },
      },
      update: { status: MembershipStatus.ACTIVE },
      create: {
        userId: input.userId,
        orgId: invite.tenantId,
        gymId: invite.locationId,
        role: invite.role,
        status: MembershipStatus.ACTIVE,
      },
    });

    await this.invitesService.consumeInvite(invite.id, input.userId);

    return { tenantId: invite.tenantId, locationId: invite.locationId, role: invite.role };
  }
}
