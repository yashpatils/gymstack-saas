import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DomainStatus, InviteStatus, MembershipRole, MembershipStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole } from '../users/user.model';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { CreateInviteDto } from './dto/create-invite.dto';

@Injectable()
export class InvitesService {
  constructor(private readonly prisma: PrismaService, private readonly jwtService: JwtService) {}

  async createInvite(requester: User, input: CreateInviteDto) {
    const tenantId = requester.activeTenantId ?? requester.orgId;
    if (!tenantId) throw new ForbiddenException('Missing tenant context');

    const canInvite = await this.prisma.membership.findFirst({
      where: {
        userId: requester.id,
        orgId: tenantId,
        status: MembershipStatus.ACTIVE,
        OR: [
          { role: MembershipRole.TENANT_OWNER },
          { role: MembershipRole.TENANT_LOCATION_ADMIN, gymId: input.locationId },
        ],
      },
      select: { id: true },
    });

    if (!canInvite && ![UserRole.Admin, UserRole.Owner].includes(requester.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const location = await this.prisma.gym.findFirst({ where: { id: input.locationId, orgId: tenantId } });
    if (!location) throw new BadRequestException('Invalid locationId');

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.locationInvite.create({
      data: {
        tenantId,
        locationId: location.id,
        role: input.role,
        email: input.email?.toLowerCase() ?? null,
        token,
        expiresAt,
        createdByUserId: requester.id,
        status: InviteStatus.PENDING,
      },
    });

    return {
      inviteUrl: await this.buildInviteLink(token, location.id, location.slug),
      token,
      expiresAt: expiresAt.toISOString(),
      locationId: location.id,
      role: input.role,
    };
  }

  async acceptInvite(input: AcceptInviteDto) {
    const invite = await this.prisma.locationInvite.findUnique({ where: { token: input.token } });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.status !== InviteStatus.PENDING) throw new BadRequestException('Invite is no longer valid');
    if (invite.expiresAt.getTime() < Date.now()) throw new BadRequestException('Invite has expired');

    const candidateEmail = (invite.email ?? input.email ?? '').toLowerCase().trim();
    if (!candidateEmail) throw new BadRequestException('Invite email is missing');

    let user = await this.prisma.user.findUnique({ where: { email: candidateEmail } });
    if (!user) {
      if (!input.password) throw new BadRequestException('Password is required to accept this invite');
      user = await this.prisma.user.create({
        data: { email: candidateEmail, password: await bcrypt.hash(input.password, 10), role: Role.USER, orgId: invite.tenantId },
      });
    }

    await this.prisma.membership.upsert({
      where: {
        userId_orgId_gymId_role: {
          userId: user.id,
          orgId: invite.tenantId,
          gymId: invite.locationId,
          role: invite.role,
        },
      },
      update: { status: MembershipStatus.ACTIVE },
      create: {
        userId: user.id,
        orgId: invite.tenantId,
        gymId: invite.locationId,
        role: invite.role,
        status: MembershipStatus.ACTIVE,
      },
    });

    await this.prisma.locationInvite.update({ where: { id: invite.id }, data: { status: InviteStatus.ACCEPTED } });

    const memberships = await this.prisma.membership.findMany({ where: { userId: user.id, status: MembershipStatus.ACTIVE } });
    const active = memberships.find((membership) => membership.orgId === invite.tenantId && membership.gymId === invite.locationId) ?? memberships[0];

    const accessToken = this.jwtService.sign({
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      orgId: active?.orgId,
      activeTenantId: active?.orgId,
      activeGymId: active?.gymId ?? null,
      activeRole: active?.role,
    });

    return {
      accessToken,
      user: { id: user.id, email: user.email, role: user.role, orgId: active?.orgId ?? user.orgId },
      memberships: memberships.map((membership) => ({
        id: membership.id,
        tenantId: membership.orgId,
        gymId: membership.gymId,
        locationId: membership.gymId,
        role: membership.role,
        status: membership.status,
      })),
      activeContext: active
        ? { tenantId: active.orgId, gymId: active.gymId, locationId: active.gymId, role: active.role }
        : undefined,
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
