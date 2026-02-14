import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ActiveMode, DomainStatus, InviteStatus, MembershipRole, MembershipStatus } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '../users/user.model';
import { OwnerOpsChoice, OwnerOpsModeDto } from './dto/owner-ops-mode.dto';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async setOwnerOpsMode(user: User, input: OwnerOpsModeDto): Promise<{ ok: true; mode?: 'MANAGER'; inviteUrl?: string; role?: MembershipRole; emailSent?: boolean }> {
    const ownerMembership = await this.prisma.membership.findFirst({
      where: {
        userId: user.id,
        orgId: input.tenantId,
        role: MembershipRole.TENANT_OWNER,
        status: MembershipStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!ownerMembership) {
      throw new ForbiddenException('Only tenant owners can configure onboarding mode');
    }

    const location = await this.prisma.gym.findFirst({
      where: { id: input.locationId, orgId: input.tenantId },
      select: { id: true, slug: true },
    });

    if (!location) {
      throw new BadRequestException('Invalid locationId for tenant');
    }

    if (input.choice === OwnerOpsChoice.OWNER_IS_MANAGER) {
      await this.prisma.ownerOperatorSetting.upsert({
        where: { userId_tenantId: { userId: user.id, tenantId: input.tenantId } },
        update: {
          allowOwnerStaffLogin: true,
          defaultMode: ActiveMode.MANAGER,
          defaultLocationId: input.locationId,
        },
        create: {
          userId: user.id,
          tenantId: input.tenantId,
          allowOwnerStaffLogin: true,
          defaultMode: ActiveMode.MANAGER,
          defaultLocationId: input.locationId,
        },
      });

      return { ok: true, mode: 'MANAGER' };
    }

    const managerEmail = input.managerEmail?.toLowerCase().trim();
    if (!managerEmail) {
      throw new BadRequestException('managerEmail is required when inviting a manager');
    }

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.locationInvite.create({
      data: {
        tenantId: input.tenantId,
        locationId: input.locationId,
        role: MembershipRole.TENANT_LOCATION_ADMIN,
        email: managerEmail,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt,
        createdByUserId: user.id,
        status: InviteStatus.PENDING,
      },
    });

    const inviteUrl = await this.buildInviteLink(token, location.id, location.slug);
    await this.emailService.sendLocationInvite(managerEmail, inviteUrl, input.managerName);

    return {
      ok: true,
      inviteUrl,
      role: MembershipRole.TENANT_LOCATION_ADMIN,
      emailSent: true,
    };
  }

  private async buildInviteLink(token: string, locationId: string, locationSlug: string): Promise<string> {
    const fallbackBase = process.env.BASE_DOMAIN ?? process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'localhost:3000';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${fallbackBase}`;

    const domain = await this.prisma.customDomain.findFirst({
      where: { locationId, status: DomainStatus.ACTIVE },
      orderBy: { createdAt: 'asc' },
      select: { hostname: true },
    });

    const host = domain?.hostname ?? `${locationSlug}.${fallbackBase}`;
    const protocol = host.includes('localhost') ? 'http' : 'https';

    if (!host) {
      return `${appUrl.replace(/\/$/, '')}/join?token=${token}`;
    }

    return `${protocol}://${host}/join?token=${token}`;
  }
}
