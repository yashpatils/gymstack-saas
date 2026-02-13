import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MembershipRole, MembershipStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole } from '../users/user.model';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { CreateInviteDto } from './dto/create-invite.dto';

@Injectable()
export class InvitesService {
  constructor(private readonly prisma: PrismaService, private readonly jwtService: JwtService) {}

  async createInvite(requester: User, input: CreateInviteDto) {
    const orgId = requester.activeTenantId ?? requester.orgId;
    if (!orgId) {
      throw new ForbiddenException('Missing tenant context');
    }

    const canInvite = await this.prisma.membership.findFirst({
      where: {
        userId: requester.id,
        orgId,
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

    const allowedInviteRoles: MembershipRole[] = [
      MembershipRole.TENANT_LOCATION_ADMIN,
      MembershipRole.GYM_STAFF_COACH,
      MembershipRole.CLIENT,
    ];

    if (!allowedInviteRoles.includes(input.role)) {
      throw new BadRequestException('Invalid invite role');
    }

    const location = await this.prisma.gym.findFirst({ where: { id: input.locationId, orgId }, select: { id: true } });
    if (!location) {
      throw new BadRequestException('Invalid locationId');
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.invite.create({
      data: {
        orgId,
        email: input.email?.toLowerCase() ?? '',
        role: Role.USER,
        tokenHash,
        expiresAt,
        createdBy: requester.id,
      },
    });

    const inviteUrl = this.buildInviteLink(token);

    return { inviteUrl, token, expiresAt: expiresAt.toISOString(), locationId: input.locationId, role: input.role };
  }

  async acceptInvite(input: AcceptInviteDto) {
    const tokenHash = this.hashToken(input.token);
    const invite = await this.prisma.invite.findFirst({
      where: {
        tokenHash,
        acceptedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invite has expired');
    }

    const candidateEmail = (invite.email || input.email || '').toLowerCase().trim();
    if (!candidateEmail) {
      throw new BadRequestException('Invite email is missing');
    }

    let user = await this.prisma.user.findUnique({ where: { email: candidateEmail } });

    if (!user) {
      if (!input.password) {
        throw new BadRequestException('Password is required to accept this invite');
      }
      const passwordHash = await bcrypt.hash(input.password, 10);
      user = await this.prisma.user.create({
        data: {
          email: candidateEmail,
          password: passwordHash,
          role: Role.USER,
          orgId: invite.orgId,
        },
      });
    }

    const gyms = await this.prisma.gym.findMany({
      where: { orgId: invite.orgId },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    const locationId = gyms[0]?.id;
    if (!locationId) {
      throw new BadRequestException('Invite tenant has no locations');
    }

    const role = MembershipRole.GYM_STAFF_COACH;

    await this.prisma.membership.upsert({
      where: {
        userId_orgId_gymId_role: {
          userId: user.id,
          orgId: invite.orgId,
          gymId: locationId,
          role,
        },
      },
      update: { status: MembershipStatus.ACTIVE },
      create: {
        userId: user.id,
        orgId: invite.orgId,
        gymId: locationId,
        role,
        status: MembershipStatus.ACTIVE,
      },
    });

    await this.prisma.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    const memberships = await this.prisma.membership.findMany({
      where: { userId: user.id, status: MembershipStatus.ACTIVE },
      orderBy: { createdAt: 'asc' },
    });

    const active = memberships[0];

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
        ? {
            tenantId: active.orgId,
            gymId: active.gymId,
            locationId: active.gymId,
            role: active.role,
          }
        : undefined,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildInviteLink(token: string): string {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    return `${frontendUrl.replace(/\/+$/, '')}/signup?intent=staff&token=${token}`;
  }
}
