import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { Membership, MembershipRole, MembershipStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthMeResponseDto, MeDto, MembershipDto } from './dto/me.dto';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { resolveEffectivePermissions } from './authorization';
import { isPlatformAdminUser } from './platform-admin.util';

function toGymSlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'gym';
}

@Injectable()
export class AuthService {
  private membershipSchemaSupport?: { hasGymId: boolean; hasStatus: boolean };

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async signup(input: SignupDto, context?: { ip?: string; userAgent?: string }): Promise<{ accessToken: string; user: MeDto; memberships: MembershipDto[]; activeContext?: { tenantId: string; gymId?: string | null; locationId?: string | null; role: MembershipRole } }> {
    const { email, password } = input;
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          role: Role.USER,
          password: passwordHash,
        },
      });

      const organization = await tx.organization.create({
        data: { name: `${email.split('@')[0]}'s Tenant` },
      });

      const location = await tx.gym.create({
        data: {
          name: `${email.split('@')[0]}'s Main Location`,
          slug: `${toGymSlug(email.split('@')[0])}-main`,
          ownerId: user.id,
          orgId: organization.id,
        },
      });

      const membership = await tx.membership.create({
        data: {
          orgId: organization.id,
          userId: user.id,
          role: MembershipRole.TENANT_OWNER,
          status: MembershipStatus.ACTIVE,
        },
      });

      await tx.user.update({ where: { id: user.id }, data: { orgId: organization.id } });
      return { user, membership, location };
    });

    await this.notificationsService.createForUser({
      userId: created.user.id,
      type: 'signup.success',
      title: 'Welcome to GymStack',
      body: 'Your account was created successfully.',
    });

    await this.auditService.log({
      orgId: created.membership.orgId,
      userId: created.user.id,
      action: 'auth.signup',
      entityType: 'user',
      entityId: created.user.id,
      metadata: { email: created.user.email },
      ip: context?.ip,
      userAgent: context?.userAgent,
    });

    const memberships = [this.toMembershipDto(created.membership)];
    const activeContext = await this.getDefaultContext([created.membership]);

    return {
      accessToken: this.signToken(created.user.id, created.user.email, created.user.role, activeContext),
      user: { id: created.user.id, email: created.user.email, role: created.user.role, orgId: created.membership.orgId },
      memberships,
      activeContext,
    };
  }

  async login(input: LoginDto, context?: { ip?: string; userAgent?: string }): Promise<{ accessToken: string; user: MeDto; memberships: MembershipDto[]; activeContext?: { tenantId: string; gymId?: string | null; locationId?: string | null; role: MembershipRole } }> {
    const { email, password } = input;
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const memberships = await this.prisma.membership.findMany({
      where: { userId: user.id, status: MembershipStatus.ACTIVE },
      orderBy: { createdAt: 'asc' },
    });

    const activeContext = await this.getDefaultContext(memberships);

    await this.auditService.log({
      orgId: activeContext?.tenantId,
      userId: user.id,
      action: 'auth.login',
      entityType: 'user',
      entityId: user.id,
      metadata: { email: user.email },
      ip: context?.ip,
      userAgent: context?.userAgent,
    });

    const resolvedRole = isPlatformAdminUser(user) ? Role.PLATFORM_ADMIN : user.role;

    return {
      accessToken: this.signToken(user.id, user.email, resolvedRole, activeContext),
      user: { id: user.id, email: user.email, role: resolvedRole, orgId: activeContext?.tenantId ?? '' },
      memberships: memberships.map((membership) => this.toMembershipDto(membership)),
      activeContext,
    };
  }

  async setContext(userId: string, tenantId: string, gymId?: string): Promise<{ accessToken: string }> {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        orgId: tenantId,
        status: MembershipStatus.ACTIVE,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!membership) {
      throw new UnauthorizedException('Invalid context for user');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (gymId) {
      const gym = await this.prisma.gym.findFirst({ where: { id: gymId, orgId: tenantId }, select: { id: true } });
      if (!gym) {
        throw new UnauthorizedException('Invalid context for user');
      }
    }

    const canUseGym = !gymId || await this.prisma.membership.findFirst({
      where: {
        userId,
        orgId: tenantId,
        status: MembershipStatus.ACTIVE,
        OR: [
          { gymId, role: { in: [MembershipRole.TENANT_LOCATION_ADMIN, MembershipRole.GYM_STAFF_COACH, MembershipRole.CLIENT] } },
          { gymId: null, role: { in: [MembershipRole.TENANT_OWNER] } },
        ],
      },
      select: { id: true },
    });

    if (!canUseGym) {
      throw new UnauthorizedException('Invalid context for user');
    }

    const activeContext = {
      tenantId: membership.orgId,
      gymId: gymId ?? null,
      locationId: gymId ?? null,
      role: membership.role,
    };

    const resolvedRole = isPlatformAdminUser(user) ? Role.PLATFORM_ADMIN : user.role;

    return { accessToken: this.signToken(user.id, user.email, resolvedRole, activeContext) };
  }

  async me(userId: string, active?: { tenantId?: string; gymId?: string; role?: MembershipRole }): Promise<AuthMeResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const memberships = await this.prisma.membership.findMany({
      where: { userId, status: MembershipStatus.ACTIVE },
      orderBy: { createdAt: 'asc' },
    });

    const fallbackContext = await this.getDefaultContext(memberships);
    const activeContext = active?.tenantId && active.role
      ? { tenantId: active.tenantId, gymId: active.gymId ?? null, locationId: active.gymId ?? null, role: active.role }
      : fallbackContext;

    const permissions = activeContext
      ? await resolveEffectivePermissions(this.prisma, userId, activeContext.tenantId, activeContext.gymId ?? undefined)
      : [];

    const resolvedRole = isPlatformAdminUser(user) ? Role.PLATFORM_ADMIN : user.role;

    return {
      user: { id: user.id, email: user.email, role: resolvedRole, orgId: activeContext?.tenantId ?? '' },
      memberships: memberships.map((membership) => this.toMembershipDto(membership)),
      activeContext: activeContext ?? undefined,
      effectiveRole: activeContext?.role,
      permissions,
    };
  }

  async forgotPassword(email: string): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { ok: true };
    }
    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashResetToken(token);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
    await this.prisma.passwordResetToken.create({ data: { tokenHash, userId: user.id, expiresAt } });
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[auth] Password reset link for ${email}: http://localhost:3000/reset-password?token=${token}`);
    }
    return { ok: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ ok: true }> {
    const tokenHash = this.hashResetToken(token);
    const now = new Date();
    const existingToken = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
    });
    if (!existingToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: existingToken.userId }, data: { password: passwordHash } }),
      this.prisma.passwordResetToken.update({ where: { id: existingToken.id }, data: { usedAt: now } }),
    ]);
    return { ok: true };
  }

  private toMembershipDto(membership: Membership): MembershipDto {
    return {
      id: membership.id,
      tenantId: membership.orgId,
      gymId: membership.gymId,
      branchId: membership.gymId,
      locationId: membership.gymId,
      role: membership.role,
      status: membership.status,
    };
  }

  private async getDefaultContext(memberships: Membership[]): Promise<{ tenantId: string; gymId?: string | null; locationId?: string | null; role: MembershipRole } | undefined> {
    if (memberships.length === 0) {
      return undefined;
    }

    const preferred = memberships.find((membership) => membership.role === MembershipRole.TENANT_OWNER) ?? memberships[0];

    const tenantGyms = await this.prisma.gym.findMany({
      where: { orgId: preferred.orgId },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    const shouldAutoSelectGym = tenantGyms.length === 1;

    return {
      tenantId: preferred.orgId,
      gymId: shouldAutoSelectGym ? tenantGyms[0].id : (preferred.gymId ?? null),
      locationId: shouldAutoSelectGym ? tenantGyms[0].id : (preferred.gymId ?? null),
      role: preferred.role,
    };
  }

  private signToken(userId: string, email: string, userRole: Role, activeContext?: { tenantId: string; gymId?: string | null; locationId?: string | null; role: MembershipRole }): string {
    return this.jwtService.sign({
      sub: userId,
      id: userId,
      email,
      role: userRole,
      orgId: activeContext?.tenantId,
      activeTenantId: activeContext?.tenantId,
      activeGymId: activeContext?.gymId,
      activeRole: activeContext?.role,
    });
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
