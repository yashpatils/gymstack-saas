import { BadRequestException, ForbiddenException, Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { ActiveMode, AuthTokenPurpose, Membership, MembershipRole, MembershipStatus, Role, UserStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailProviderError, EmailService } from '../email/email.service';
import { AuthTokenService } from './auth-token.service';
import { AuthMeResponseDto, MeDto, MembershipDto } from './dto/me.dto';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { permissionFlagsToKeys, resolvePermissions } from './permission-resolver';
import { getPlatformAdminEmails, isPlatformAdmin } from './platform-admin.util';
import { RefreshTokenService } from './refresh-token.service';
import { RegisterWithInviteDto } from './dto/register-with-invite.dto';
import { InviteAdmissionService } from '../invites/invite-admission.service';

function toGymSlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'gym';
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly authTokenService: AuthTokenService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly inviteAdmissionService: InviteAdmissionService,
  ) {}

  onModuleInit(): void {
    const allowlistedEmails = getPlatformAdminEmails(this.configService);
    if (allowlistedEmails.length === 0) {
      this.logger.warn('PLATFORM_ADMIN_EMAILS is not configured. platformRole will always be null.');
      return;
    }

    this.logger.log(`PLATFORM_ADMIN_EMAILS loaded (${allowlistedEmails.length} emails)`);
  }

  async signup(input: SignupDto, context?: { ip?: string; userAgent?: string }): Promise<{ accessToken: string; refreshToken: string; user: MeDto; memberships: MembershipDto[]; activeContext?: { tenantId: string; gymId?: string | null; locationId?: string | null; role: MembershipRole }; emailDeliveryWarning?: string }> {
    const email = input.email?.trim().toLowerCase();
    const { password } = input;
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    if (input.inviteToken) {
      return this.signupWithInvite({
        email,
        password,
        inviteToken: input.inviteToken,
      }, context);
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
          emailVerifiedAt: null,
          status: UserStatus.ACTIVE,
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

    const verificationToken = await this.authTokenService.issueToken({
      userId: created.user.id,
      purpose: AuthTokenPurpose.EMAIL_VERIFY,
      ttlMinutes: this.getTtlMinutes('EMAIL_VERIFICATION_TOKEN_TTL_MINUTES', 60),
    });
    let emailDeliveryWarning: string | undefined;
    if (!this.isVerificationEmailDeliveryEnabled()) {
      emailDeliveryWarning = 'Email delivery is not configured in this environment yet. Contact support.';
    }
    try {
      await this.emailService.sendVerifyEmail({ to: created.user.email, token: verificationToken });
    } catch (error) {
      if (error instanceof EmailProviderError && error.statusCode === 403) {
        this.logger.error(
          JSON.stringify({
            event: 'email_delivery_not_configured',
            provider: 'resend',
            statusCode: error.statusCode,
            providerCode: error.providerCode ?? null,
            message: error.message,
          }),
        );
        emailDeliveryWarning = 'Email delivery not configured yet. Contact support.';
      } else {
        throw error;
      }
    }

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
    const refreshToken = await this.refreshTokenService.issue(created.user.id, { ipAddress: context?.ip, userAgent: context?.userAgent });

    return {
      accessToken: this.signToken(created.user.id, created.user.email, created.user.role, activeContext),
      refreshToken,
      user: {
        id: created.user.id,
        email: created.user.email,
        role: created.user.role,
        orgId: created.membership.orgId,
        emailVerified: false,
        emailVerifiedAt: null,
      },
      memberships,
      activeContext,
      emailDeliveryWarning,
    };
  }

  private async signupWithInvite(
    input: { email: string; password: string; inviteToken: string },
    context?: { ip?: string; userAgent?: string },
  ): Promise<{ accessToken: string; refreshToken: string; user: MeDto; memberships: MembershipDto[]; activeContext?: { tenantId: string; gymId?: string | null; locationId?: string | null; role: MembershipRole } }> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });

    const user = await this.prisma.$transaction(async (tx) => {
      if (!existing) {
        return tx.user.create({
          data: {
            email: input.email,
            password: await bcrypt.hash(input.password, 10),
            role: Role.USER,
            emailVerifiedAt: null,
            status: UserStatus.ACTIVE,
          },
        });
      }

      if (existing.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Account is unavailable');
      }

      if (existing.password) {
        const passwordMatches = await bcrypt.compare(input.password, existing.password);
        if (!passwordMatches) {
          throw new UnauthorizedException('Invalid credentials');
        }
      } else {
        await tx.user.update({
          where: { id: existing.id },
          data: { password: await bcrypt.hash(input.password, 10) },
        });
      }

      return existing;
    });

    await this.inviteAdmissionService.admitWithInvite({
      token: input.inviteToken,
      userId: user.id,
      emailFromProviderOrSignup: input.email,
    });

    const memberships = await this.prisma.membership.findMany({
      where: { userId: user.id, status: MembershipStatus.ACTIVE },
      orderBy: { createdAt: 'asc' },
    });
    const activeContext = await this.getDefaultContext(memberships);
    const refreshToken = await this.refreshTokenService.issue(user.id, { ipAddress: context?.ip, userAgent: context?.userAgent });

    return {
      accessToken: this.signToken(user.id, user.email, user.role, activeContext),
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: activeContext?.tenantId ?? '',
        emailVerified: Boolean(user.emailVerifiedAt),
        emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
      },
      memberships: memberships.map((membership) => this.toMembershipDto(membership)),
      activeContext,
    };
  }

  async login(input: LoginDto, context?: { ip?: string; userAgent?: string }): Promise<{ accessToken: string; refreshToken: string; user: MeDto; memberships: MembershipDto[]; activeContext?: { tenantId: string; gymId?: string | null; locationId?: string | null; role: MembershipRole } }> {
    const email = input.email?.trim().toLowerCase();
    const { password } = input;
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== UserStatus.ACTIVE) {
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
    const refreshToken = await this.refreshTokenService.issue(user.id, { ipAddress: context?.ip, userAgent: context?.userAgent });

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

    const resolvedRole = isPlatformAdmin(user.email, getPlatformAdminEmails(this.configService)) ? Role.PLATFORM_ADMIN : user.role;

    return {
      accessToken: this.signToken(user.id, user.email, resolvedRole, activeContext),
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: resolvedRole,
        orgId: activeContext?.tenantId ?? '',
        emailVerified: Boolean(user.emailVerifiedAt),
        emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
      },
      memberships: memberships.map((membership) => this.toMembershipDto(membership)),
      activeContext,
    };
  }

  async adminLogin(input: LoginDto, context?: { ip?: string; userAgent?: string }): Promise<{ accessToken: string; refreshToken: string; user: MeDto; memberships: MembershipDto[]; activeContext?: { tenantId: string; gymId?: string | null; locationId?: string | null; role: MembershipRole } }> {
    const loginResponse = await this.login(input, context);
    const isAllowlisted = isPlatformAdmin(loginResponse.user.email, getPlatformAdminEmails(this.configService));

    if (!isAllowlisted) {
      throw new ForbiddenException('Access restricted');
    }

    return loginResponse;
  }

  async registerWithInvite(
    input: RegisterWithInviteDto,
    context?: { ip?: string; userAgent?: string },
  ): Promise<{ accessToken: string; refreshToken: string; user: MeDto; memberships: MembershipDto[]; activeContext?: { tenantId: string; gymId?: string | null; locationId?: string | null; role: MembershipRole } }> {
    const normalizedEmail = input.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    const user = existing ?? await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        password: await bcrypt.hash(input.password, 10),
        role: Role.USER,
        emailVerifiedAt: null,
        status: UserStatus.ACTIVE,
      },
    });

    await this.inviteAdmissionService.admitWithInvite({
      token: input.token,
      userId: user.id,
      emailFromProviderOrSignup: normalizedEmail,
    });

    const memberships = await this.prisma.membership.findMany({
      where: { userId: user.id, status: MembershipStatus.ACTIVE },
      orderBy: { createdAt: 'asc' },
    });
    const activeContext = await this.getDefaultContext(memberships);
    const refreshToken = await this.refreshTokenService.issue(user.id, { ipAddress: context?.ip, userAgent: context?.userAgent });

    return {
      accessToken: this.signToken(user.id, user.email, user.role, activeContext),
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: activeContext?.tenantId ?? '',
        emailVerified: Boolean(user.emailVerifiedAt),
        emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
      },
      memberships: memberships.map((membership) => this.toMembershipDto(membership)),
      activeContext,
    };
  }


  async refresh(refreshToken: string, context?: { ip?: string; userAgent?: string }): Promise<{ accessToken: string; refreshToken: string; me: AuthMeResponseDto }> {
    const rotated = await this.refreshTokenService.rotate(refreshToken, {
      ipAddress: context?.ip,
      userAgent: context?.userAgent,
    });
    const accessToken = await this.issueAccessTokenForUser(rotated.userId);
    const me = await this.me(rotated.userId);

    await this.auditService.log({
      userId: rotated.userId,
      action: 'auth.refresh',
      entityType: 'user',
      entityId: rotated.userId,
      ip: context?.ip,
      userAgent: context?.userAgent,
    });

    return { accessToken, refreshToken: rotated.refreshToken, me };
  }

  async logout(userId: string, payload?: { refreshToken?: string; all?: boolean }): Promise<{ ok: true }> {
    if (payload?.all) {
      await this.refreshTokenService.revokeAllForUser(userId);
      return { ok: true };
    }

    if (payload?.refreshToken) {
      await this.refreshTokenService.revoke(payload.refreshToken);
      return { ok: true };
    }

    await this.refreshTokenService.revokeAllForUser(userId);
    return { ok: true };
  }

  async resendVerification(email: string): Promise<{ ok: true; message: string; emailDeliveryWarning?: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    const fallbackWarning = !this.isVerificationEmailDeliveryEnabled()
      ? 'Email delivery is not configured in this environment yet. Contact support.'
      : undefined;

    if (!user || user.status !== UserStatus.ACTIVE || user.emailVerifiedAt) {
      return { ok: true, message: 'If your account exists, a verification email has been sent.', emailDeliveryWarning: fallbackWarning };
    }

    const verificationToken = await this.authTokenService.issueToken({
      userId: user.id,
      purpose: AuthTokenPurpose.EMAIL_VERIFY,
      ttlMinutes: this.getTtlMinutes('EMAIL_VERIFICATION_TOKEN_TTL_MINUTES', 60),
    });
    try {
      await this.emailService.sendVerifyEmail({ to: user.email, token: verificationToken });
    } catch (error) {
      let emailDeliveryWarning = fallbackWarning;
      if (error instanceof EmailProviderError && error.statusCode === 403) {
        emailDeliveryWarning = 'Email delivery not configured yet. Contact support.';
      }
      const message = error instanceof Error ? error.message : 'Unknown email error';
      this.logger.error(
        JSON.stringify({
          event: 'resend_verification_email_failed',
          email: this.redactEmail(user.email),
          statusCode: error instanceof EmailProviderError ? error.statusCode ?? null : null,
          providerCode: error instanceof EmailProviderError ? error.providerCode ?? null : null,
          message,
        }),
      );

      return {
        ok: true,
        message: 'If your account exists, a verification email has been sent.',
        emailDeliveryWarning,
      };
    }

    return {
      ok: true,
      message: 'If your account exists, a verification email has been sent.',
      emailDeliveryWarning: fallbackWarning,
    };
  }


  private isVerificationEmailDeliveryEnabled(): boolean {
    const apiKey = this.configService.get<string>('RESEND_API_KEY')?.trim();
    const emailDisableRaw = (this.configService.get<string>('EMAIL_DISABLE') ?? 'false').trim().toLowerCase();
    const emailDisabled = ['true', '1', 'yes', 'on'].includes(emailDisableRaw);

    return !emailDisabled && Boolean(apiKey);
  }

  async verifyEmail(token: string): Promise<{ ok: true }> {
    try {
      const consumed = await this.authTokenService.consumeToken({
        token,
        purpose: AuthTokenPurpose.EMAIL_VERIFY,
      });

      await this.prisma.user.update({
        where: { id: consumed.userId },
        data: { emailVerifiedAt: new Date() },
      });
      return { ok: true };
    } catch {
      throw new BadRequestException('Invalid or expired verification token');
    }
  }

  async setContext(userId: string, tenantId: string, gymId?: string): Promise<{ accessToken: string; me: AuthMeResponseDto }> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId, orgId: tenantId, status: MembershipStatus.ACTIVE },
      orderBy: { createdAt: 'asc' },
    });

    if (memberships.length === 0) {
      throw new ForbiddenException('Invalid context for user');
    }

    const ownerMembership = memberships.find((membership) => membership.role === MembershipRole.TENANT_OWNER);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (gymId) {
      const gym = await this.prisma.gym.findFirst({ where: { id: gymId, orgId: tenantId }, select: { id: true } });
      if (!gym) {
        throw new ForbiddenException('Invalid context for user');
      }
    }

    const locationMembership = memberships.find(
      (membership) => membership.gymId === gymId
        && (membership.role === MembershipRole.TENANT_LOCATION_ADMIN || membership.role === MembershipRole.GYM_STAFF_COACH || membership.role === MembershipRole.CLIENT),
    );

    if (gymId && !locationMembership) {
      const locations = await this.prisma.gym.findMany({ where: { orgId: tenantId }, select: { id: true } });
      const canOwnerActAsManager = Boolean(ownerMembership) && (
        locations.length === 1
        || memberships.some((membership) => membership.role === MembershipRole.TENANT_LOCATION_ADMIN && membership.gymId === gymId)
      );
      if (!canOwnerActAsManager) {
        throw new ForbiddenException('Invalid context for user');
      }
    }

    const activeContext = {
      tenantId,
      gymId: gymId ?? null,
      locationId: gymId ?? null,
      role: locationMembership?.role ?? ownerMembership?.role ?? memberships[0].role,
    };

    const resolvedRole = isPlatformAdmin(user.email, getPlatformAdminEmails(this.configService)) ? Role.PLATFORM_ADMIN : user.role;
    const accessToken = this.signToken(user.id, user.email, resolvedRole, activeContext);

    return {
      accessToken,
      me: await this.me(user.id, { tenantId, gymId: gymId ?? undefined, role: activeContext.role }),
    };
  }



  async setMode(userId: string, tenantId: string, mode: ActiveMode, locationId?: string): Promise<AuthMeResponseDto> {
    const ownerMembership = await this.prisma.membership.findFirst({
      where: { userId, orgId: tenantId, role: MembershipRole.TENANT_OWNER, status: MembershipStatus.ACTIVE },
      select: { id: true },
    });
    if (!ownerMembership) {
      throw new UnauthorizedException('Only tenant owners can switch mode');
    }

    if (mode === ActiveMode.MANAGER) {
      const gyms = await this.prisma.gym.findMany({ where: { orgId: tenantId }, select: { id: true } });
      const settings = await this.prisma.ownerOperatorSetting.upsert({
        where: { userId_tenantId: { userId, tenantId } },
        update: {},
        create: { userId, tenantId },
      });
      if (!settings.allowOwnerStaffLogin && gyms.length !== 1) {
        throw new UnauthorizedException('Manager mode is disabled for this owner');
      }
      const targetLocationId = locationId ?? (gyms.length === 1 ? gyms[0].id : undefined);
      if (!targetLocationId) {
        throw new BadRequestException('locationId is required for manager mode');
      }
      const location = await this.prisma.gym.findFirst({ where: { id: targetLocationId, orgId: tenantId }, select: { id: true } });
      if (!location) {
        throw new BadRequestException('Invalid locationId for tenant');
      }

      const token = this.signToken(userId, (await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })).email, Role.USER, {
        tenantId,
        gymId: targetLocationId,
        locationId: targetLocationId,
        role: MembershipRole.TENANT_LOCATION_ADMIN,
      }, ActiveMode.MANAGER);
      return this.me(userId, { tenantId, gymId: targetLocationId, role: MembershipRole.TENANT_LOCATION_ADMIN, activeMode: ActiveMode.MANAGER, accessToken: token });
    }

    return this.me(userId, { tenantId, activeMode: ActiveMode.OWNER });
  }

  async me(userId: string, active?: { tenantId?: string; gymId?: string; role?: MembershipRole; activeMode?: ActiveMode; accessToken?: string }): Promise<AuthMeResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, status: true } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const memberships = await this.prisma.membership.findMany({
      where: { userId, status: MembershipStatus.ACTIVE },
      orderBy: { createdAt: 'asc' },
    });

    const fallbackContext = await this.getDefaultContext(memberships);
    const selectedContext = active?.tenantId && active.role
      ? { tenantId: active.tenantId, gymId: active.gymId ?? null, locationId: active.gymId ?? null, role: active.role }
      : fallbackContext;

    const allowlistedEmails = getPlatformAdminEmails(this.configService);
    const userIsPlatformAdmin = isPlatformAdmin(user.email, allowlistedEmails);

    const canonicalContext = {
      tenantId: selectedContext?.tenantId ?? null,
      locationId: selectedContext?.locationId ?? null,
      role: selectedContext?.role ?? null,
    };

    const permissionFlags = resolvePermissions(canonicalContext.role);

    return {
      user: { id: user.id, email: user.email },
      platformRole: userIsPlatformAdmin ? 'PLATFORM_ADMIN' : null,
      memberships: {
        tenant: memberships
          .filter((membership) => membership.role === MembershipRole.TENANT_OWNER)
          .map((membership) => ({ tenantId: membership.orgId, role: 'TENANT_OWNER' as const })),
        location: memberships
          .filter((membership) => membership.gymId && membership.role !== MembershipRole.TENANT_OWNER)
          .map((membership) => ({
            tenantId: membership.orgId,
            locationId: membership.gymId as string,
            role: membership.role as 'TENANT_LOCATION_ADMIN' | 'GYM_STAFF_COACH' | 'CLIENT',
          })),
      },
      activeContext: canonicalContext,
      permissions: permissionFlags,
      permissionKeys: permissionFlagsToKeys(permissionFlags),
    };
  }


  async forgotPassword(email: string): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      return { ok: true };
    }
    const token = randomTokenHex();
    const tokenHash = this.hashResetToken(token);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
    await this.prisma.passwordResetToken.create({ data: { tokenHash, userId: user.id, expiresAt } });
    try {
      await this.emailService.sendResetPasswordEmail({ to: user.email, token });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown email error';
      this.logger.error(`forgot-password email failed: ${message}`);
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

  async issueAccessTokenForUser(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const memberships = await this.prisma.membership.findMany({
      where: { userId, status: MembershipStatus.ACTIVE },
      orderBy: { createdAt: 'asc' },
    });
    const activeContext = await this.getDefaultContext(memberships);
    return this.signToken(user.id, user.email, user.role, activeContext);
  }

  private redactEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) {
      return '***';
    }

    if (localPart.length <= 2) {
      return `${localPart[0] ?? '*'}***@${domain}`;
    }

    return `${localPart.slice(0, 2)}***@${domain}`;
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

  private signToken(userId: string, email: string, userRole: Role, activeContext?: { tenantId: string; gymId?: string | null; locationId?: string | null; role: MembershipRole }, activeMode: ActiveMode = ActiveMode.OWNER): string {
    return this.jwtService.sign({
      sub: userId,
      jti: randomBytes(16).toString('hex'),
      id: userId,
      email,
      role: userRole,
      orgId: activeContext?.tenantId,
      activeTenantId: activeContext?.tenantId,
      activeGymId: activeContext?.gymId,
      activeRole: activeContext?.role,
      activeMode,
    });
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getTtlMinutes(envName: string, fallback: number): number {
    const raw = process.env[envName];
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }

    return fallback;
  }
}

function randomTokenHex(): string {
  return randomBytes(32).toString('hex');
}
