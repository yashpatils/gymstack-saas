import { ForbiddenException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { MembershipRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { resolveEffectivePermissions } from './authorization';
import { AuditService } from '../audit/audit.service';
import { getPlatformAdminEmails, isPlatformAdmin } from './platform-admin.util';
import { isQaModeEnabled, shouldApplyQaBypass } from '../common/qa-mode.util';
import { getJwtSecret } from '../common/env.util';

interface JwtPayload {
  sub: string;
  id: string;
  email: string;
  role?: string;
  orgId?: string;
  activeTenantId?: string;
  activeGymId?: string;
  activeRole?: MembershipRole;
  activeMode?: 'OWNER' | 'MANAGER';
  qaBypass?: boolean;
}

type SupportModeContext = {
  tenantId: string;
  locationId?: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly qaModeEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: getJwtSecret(configService),
      passReqToCallback: true,
    });

    this.qaModeEnabled = isQaModeEnabled(this.configService.get<string>('QA_MODE'));
  }

  async validate(
    request: { headers: Record<string, string | string[] | undefined>; ip?: string },
    payload: JwtPayload,
  ): Promise<JwtPayload & { userId: string; permissions: string[]; isPlatformAdmin: boolean; supportMode?: SupportModeContext; emailVerifiedAt: Date | null; activeLocationId?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { email: true, emailVerifiedAt: true, qaBypass: true },
    });

    const userIsPlatformAdmin = isPlatformAdmin(user?.email, getPlatformAdminEmails(this.configService));
    const supportMode = await this.resolveSupportModeContext(request.headers, request.ip, payload.sub, userIsPlatformAdmin);

    const tenantId = supportMode?.tenantId ?? payload.activeTenantId;
    const locationId = supportMode?.locationId ?? payload.activeGymId;

    if (tenantId) {
      const tenant = await this.prisma.organization.findUnique({
        where: { id: tenantId },
        select: { isDisabled: true },
      });
      if (tenant?.isDisabled) {
        throw new ForbiddenException({ code: 'TENANT_DISABLED', message: 'Tenant is disabled' });
      }
    }

    const permissions = tenantId
      ? await resolveEffectivePermissions(this.prisma, payload.sub, tenantId, locationId)
      : [];

    const adminEmail = this.configService.get<string>('ADMIN_EMAIL')?.trim().toLowerCase();
    const isAdminEmailUser = Boolean(adminEmail && user?.email?.trim().toLowerCase() === adminEmail);

    return {
      ...payload,
      userId: payload.sub,
      activeTenantId: tenantId,
      activeGymId: locationId,
      activeLocationId: locationId,
      permissions,
      isPlatformAdmin: userIsPlatformAdmin,
      supportMode,
      emailVerifiedAt: user?.emailVerifiedAt ?? null,
      qaBypass: shouldApplyQaBypass({
        qaModeEnabled: this.qaModeEnabled,
        userQaBypass: payload.qaBypass ?? user?.qaBypass ?? false,
        isPlatformAdmin: userIsPlatformAdmin,
        isAdminEmailUser,
      }),
    };
  }

  private getHeaderValue(headers: Record<string, string | string[] | undefined>, headerName: string): string | undefined {
    const value = headers[headerName];
    if (!value) {
      return undefined;
    }

    return Array.isArray(value) ? value[0]?.trim() : value.trim();
  }

  private async resolveSupportModeContext(
    headers: Record<string, string | string[] | undefined>,
    requestIp: string | undefined,
    userId: string,
    userIsPlatformAdmin: boolean,
  ): Promise<SupportModeContext | undefined> {
    const supportTenantIdHeader = this.getHeaderValue(headers, 'x-support-tenant-id');
    const supportLocationIdHeader = this.getHeaderValue(headers, 'x-support-location-id');

    if (!supportTenantIdHeader && !supportLocationIdHeader) {
      return undefined;
    }

    if (!userIsPlatformAdmin) {
      return undefined;
    }

    let tenantId = supportTenantIdHeader;
    if (supportLocationIdHeader) {
      const location = await this.prisma.gym.findUnique({
        where: { id: supportLocationIdHeader },
        select: { orgId: true },
      });

      if (!location) {
        throw new ForbiddenException('Invalid support mode location context');
      }

      if (tenantId && location.orgId !== tenantId) {
        throw new ForbiddenException('Support mode tenant/location mismatch');
      }

      tenantId = location.orgId;
    }

    if (!tenantId) {
      throw new ForbiddenException('Support mode requires tenant context');
    }

    await this.auditService.log({
      orgId: tenantId,
      userId,
      action: 'support_mode_assume_context',
      entityType: 'support_mode',
      entityId: supportLocationIdHeader ?? tenantId,
      metadata: {
        tenantId,
        locationId: supportLocationIdHeader ?? null,
      },
      ip: this.getHeaderValue(headers, 'x-forwarded-for')?.split(',')[0]?.trim() ?? requestIp ?? null,
      userAgent: this.getHeaderValue(headers, 'user-agent') ?? null,
    });

    return {
      tenantId,
      locationId: supportLocationIdHeader,
    };
  }
}
