import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { MembershipRole, MembershipStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthMeResponseDto, MeDto, MembershipDto } from './dto/me.dto';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { resolvePermissions } from './permissions';

@Injectable()
export class AuthService {
  private membershipSchemaSupport?: { hasGymId: boolean; hasStatus: boolean };

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async signup(input: SignupDto, context?: { ip?: string; userAgent?: string }): Promise<{ accessToken: string; user: MeDto; memberships: MembershipDto[]; activeContext?: { tenantId: string; gymId?: string | null; role: MembershipRole } }> {
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
          role: input.role ?? Role.USER,
          password: passwordHash,
        },
      });

      const organization = await tx.organization.create({
        data: { name: `${email.split('@')[0]}'s Tenant` },
      });

      const membership = await tx.membership.create({
        data: {
          orgId: organization.id,
          userId: user.id,
          role: MembershipRole.tenant_owner,
          status: MembershipStatus.ACTIVE,
        },
      });

      await tx.user.update({ where: { id: user.id }, data: { orgId: organization.id } });
      return { user, membership };
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

    const memberships = [this.toMembershipDto({
      id: created.membership.id,
      tenantId: created.membership.orgId,
      gymId: created.membership.gymId,
      role: created.membership.role,
      status: created.membership.status,
    })];
    const activeContext = this.getDefaultContext(memberships);

    return {
      accessToken: this.signToken(created.user.id, created.user.email, created.user.role, activeContext),
      user: { id: created.user.id, email: created.user.email, role: created.user.role, orgId: created.membership.orgId },
      memberships,
      activeContext,
    };
  }

  async login(input: LoginDto, context?: { ip?: string; userAgent?: string }): Promise<{ accessToken: string; user: MeDto; memberships: MembershipDto[]; activeContext?: { tenantId: string; gymId?: string | null; role: MembershipRole } }> {
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

    const memberships = await this.listMemberships(user.id);

    const activeContext = this.getDefaultContext(memberships);

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

    return {
      accessToken: this.signToken(user.id, user.email, user.role, activeContext),
      user: { id: user.id, email: user.email, role: user.role, orgId: activeContext?.tenantId ?? '' },
      memberships,
      activeContext,
    };
  }

  async setContext(userId: string, tenantId: string, gymId?: string): Promise<{ accessToken: string }> {
    const memberships = await this.listMemberships(userId);
    const membership = memberships.find(
      (item) => item.tenantId === tenantId && (!gymId || item.gymId === gymId),
    );

    if (!membership) {
      throw new UnauthorizedException('Invalid context for user');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const activeContext = {
      tenantId: membership.tenantId,
      gymId: membership.gymId,
      role: membership.role,
    };

    return { accessToken: this.signToken(user.id, user.email, user.role, activeContext) };
  }

  async me(userId: string, active?: { tenantId?: string; gymId?: string; role?: MembershipRole }): Promise<AuthMeResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const memberships = await this.listMemberships(userId);

    const fallbackContext = this.getDefaultContext(memberships);
    const activeContext = active?.tenantId && active.role
      ? { tenantId: active.tenantId, gymId: active.gymId ?? null, role: active.role }
      : fallbackContext;

    const permissions = activeContext ? resolvePermissions(activeContext.role) : [];

    return {
      user: { id: user.id, email: user.email, role: user.role, orgId: activeContext?.tenantId ?? '' },
      memberships,
      activeContext: activeContext ?? undefined,
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

  private toMembershipDto(membership: { id: string; tenantId: string; gymId?: string | null; role: MembershipRole; status: MembershipStatus }): MembershipDto {
    return {
      id: membership.id,
      tenantId: membership.tenantId,
      gymId: membership.gymId,
      role: membership.role,
      status: membership.status,
    };
  }

  private getDefaultContext(memberships: MembershipDto[]): { tenantId: string; gymId?: string | null; role: MembershipRole } | undefined {
    if (memberships.length === 0) {
      return undefined;
    }

    const preferred = memberships.find((membership) => membership.role === MembershipRole.tenant_owner) ?? memberships[0];

    return {
      tenantId: preferred.tenantId,
      gymId: preferred.gymId,
      role: preferred.role,
    };
  }

  private async getMembershipSchemaSupport(): Promise<{ hasGymId: boolean; hasStatus: boolean }> {
    if (this.membershipSchemaSupport) {
      return this.membershipSchemaSupport;
    }

    const [gymColumn, statusColumn] = await Promise.all([
      this.prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'Membership' AND column_name = 'gymId'
        )
      `,
      this.prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'Membership' AND column_name = 'status'
        )
      `,
    ]);

    this.membershipSchemaSupport = {
      hasGymId: Boolean(gymColumn[0]?.exists),
      hasStatus: Boolean(statusColumn[0]?.exists),
    };

    return this.membershipSchemaSupport;
  }

  private normalizeMembershipRole(role: string): MembershipRole {
    if (role === MembershipRole.tenant_owner || role === 'OWNER') {
      return MembershipRole.tenant_owner;
    }
    if (role === MembershipRole.tenant_admin || role === 'ADMIN') {
      return MembershipRole.tenant_admin;
    }
    if (role === MembershipRole.gym_owner || role === 'gym_owner') {
      return MembershipRole.gym_owner;
    }
    if (role === MembershipRole.branch_manager || role === 'branch_manager') {
      return MembershipRole.branch_manager;
    }
    if (role === MembershipRole.personal_trainer || role === 'personal_trainer') {
      return MembershipRole.personal_trainer;
    }
    if (role === MembershipRole.client || role === 'MEMBER' || role === 'client') {
      return MembershipRole.client;
    }
    return MembershipRole.client;
  }

  private normalizeMembershipStatus(status?: string | null): MembershipStatus {
    if (status === MembershipStatus.ACTIVE || status === 'ACTIVE') {
      return MembershipStatus.ACTIVE;
    }
    if (status === MembershipStatus.INVITED || status === 'INVITED') {
      return MembershipStatus.INVITED;
    }
    if (status === MembershipStatus.SUSPENDED || status === 'SUSPENDED') {
      return MembershipStatus.SUSPENDED;
    }
    return MembershipStatus.ACTIVE;
  }

  private async listMemberships(userId: string): Promise<MembershipDto[]> {
    const support = await this.getMembershipSchemaSupport();

    const gymColumn = support.hasGymId
      ? Prisma.sql`"gymId"::text AS "gymId",`
      : Prisma.sql`NULL::text AS "gymId",`;

    const statusColumn = support.hasStatus
      ? Prisma.sql`"status"::text AS "status"`
      : Prisma.sql`'ACTIVE'::text AS "status"`;

    const rows = await this.prisma.$queryRaw<Array<{
      id: string;
      orgId: string;
      gymId: string | null;
      role: string;
      status: string | null;
    }>>(Prisma.sql`
      SELECT
        "id",
        "orgId"::text AS "orgId",
        ${gymColumn}
        "role"::text AS "role",
        ${statusColumn}
      FROM "Membership"
      WHERE "userId" = ${userId}
      ORDER BY "createdAt" ASC
    `);

    return rows
      .map((row) => this.toMembershipDto({
        id: row.id,
        tenantId: row.orgId,
        gymId: row.gymId,
        role: this.normalizeMembershipRole(row.role),
        status: this.normalizeMembershipStatus(row.status),
      }))
      .filter((row) => row.status === MembershipStatus.ACTIVE);
  }

  private signToken(userId: string, email: string, userRole: Role, activeContext?: { tenantId: string; gymId?: string | null; role: MembershipRole }): string {
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
