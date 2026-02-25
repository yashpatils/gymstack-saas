import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditActorType, ChangeIntentStatus, ChangeIntentType, MembershipStatus, NotificationType, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  RequestDisableTwoStepEmailDto,
  RequestEnableTwoStepEmailDto,
  TwoStepOtpChallengeResponseDto,
  TwoStepToggleResponseDto,
  VerifyDisableTwoStepEmailDto,
  VerifyEnableTwoStepEmailDto,
} from './dto/two-step-email.dto';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notifications.service';
import { ConfirmChangeIntentDto, CreateChangeIntentDto } from './dto/change-intent.dto';

export type SecurityRequestMeta = {
  ip?: string;
  userAgent?: string;
};

const OTP_EXPIRY_SECONDS = 10 * 60;
const RESEND_COOLDOWN_SECONDS = 60;

@Injectable()
export class SecurityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
  ) {}

  async createChangeIntent(
    requester: { id: string; email: string },
    dto: CreateChangeIntentDto,
    meta?: SecurityRequestMeta,
  ) {
    const now = new Date();
    const otp = this.generateOtp();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_SECONDS * 1000);
    const payload = await this.normalizePayload(requester.id, dto);
    const tenantId = await this.resolveTenantId(requester.id, dto.orgId, dto.gymId);

    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required for sensitive changes');
    }

    const intent = await this.prisma.changeIntent.create({
      data: {
        userId: requester.id,
        orgId: dto.orgId ?? tenantId,
        gymId: dto.gymId,
        type: dto.type,
        payloadJson: payload as Prisma.InputJsonValue,
        otpHash: this.hashOtp(otp),
        expiresAt,
      },
    });

    this.auditService.log({
      actor: { userId: requester.id, type: AuditActorType.USER, email: requester.email },
      tenantId,
      locationId: dto.gymId ?? null,
      action: 'SENSITIVE_CHANGE_INTENT_CREATED',
      targetType: 'change_intent',
      targetId: intent.id,
      metadata: { type: dto.type },
      ip: meta?.ip ?? null,
      userAgent: meta?.userAgent ?? null,
    });
    await this.notificationService.createForUser({
      tenantId,
      locationId: dto.gymId,
      userId: requester.id,
      type: NotificationType.SYSTEM,
      title: 'Sensitive change verification requested',
      body: 'Enter the emailed OTP to complete your requested change.',
      metadata: { changeIntentId: intent.id, type: dto.type },
    });

    await this.emailService.sendTemplatedActionEmail({
      to: requester.email,
      template: 'sensitive_change_otp',
      subject: 'Confirm your sensitive Gymstack change',
      title: 'Confirm change with OTP',
      intro: `Use this one-time code: ${otp}. It expires in ${Math.floor(OTP_EXPIRY_SECONDS / 60)} minutes.`,
      buttonLabel: 'Open settings',
      link: '/platform/settings',
    });

    return {
      id: intent.id,
      type: intent.type,
      expiresAt: intent.expiresAt.toISOString(),
      status: intent.status,
      maskedEmail: this.maskEmail(requester.email),
    };
  }

  async confirmChangeIntent(
    requester: { id: string; email: string },
    intentId: string,
    dto: ConfirmChangeIntentDto,
    meta?: SecurityRequestMeta,
  ) {
    const intent = await this.prisma.changeIntent.findFirst({ where: { id: intentId, userId: requester.id } });
    if (!intent) throw new NotFoundException('Change intent not found');
    if (intent.status !== ChangeIntentStatus.PENDING) throw new BadRequestException('Change intent already processed');
    if (intent.expiresAt <= new Date()) {
      await this.prisma.changeIntent.update({ where: { id: intent.id }, data: { status: ChangeIntentStatus.EXPIRED } });
      throw new BadRequestException('OTP expired');
    }
    if (this.hashOtp(dto.otp) !== intent.otpHash) throw new BadRequestException('Invalid OTP');

    const tenantId = await this.resolveTenantId(requester.id, intent.orgId, intent.gymId);
    if (!tenantId) throw new ForbiddenException('Tenant context is required for sensitive changes');

    const payload = intent.payloadJson as Record<string, unknown>;
    const confirmedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.changeIntent.update({ where: { id: intent.id }, data: { status: ChangeIntentStatus.CONFIRMED } });

      switch (intent.type) {
        case ChangeIntentType.EMAIL_CHANGE:
          await tx.user.update({ where: { id: requester.id }, data: { email: String(payload.newEmail ?? '') } });
          await tx.refreshToken.updateMany({ where: { userId: requester.id, revokedAt: null }, data: { revokedAt: confirmedAt } });
          break;
        case ChangeIntentType.PASSWORD_CHANGE:
          await tx.user.update({ where: { id: requester.id }, data: { password: String(payload.newPasswordHash ?? '') } });
          await tx.refreshToken.updateMany({ where: { userId: requester.id, revokedAt: null }, data: { revokedAt: confirmedAt } });
          break;
        case ChangeIntentType.ORG_SETTINGS_CHANGE:
          await tx.organization.update({
            where: { id: intent.orgId ?? '' },
            data: {
              name: payload.name as string | undefined,
              whiteLabelEnabled: payload.whiteLabelEnabled as boolean | undefined,
              billingCountry: payload.billingCountry as string | undefined,
              billingCurrency: payload.billingCurrency as string | undefined,
            },
          });
          break;
        case ChangeIntentType.GYM_SETTINGS_CHANGE:
          await tx.gym.update({
            where: { id: intent.gymId ?? '' },
            data: {
              name: payload.name as string | undefined,
              timezone: payload.timezone as string | undefined,
              contactEmail: payload.contactEmail as string | undefined,
              phone: payload.phone as string | undefined,
              address: payload.address as string | undefined,
            },
          });
          break;
        case ChangeIntentType.SLUG_CHANGE: {
          let gymId = intent.gymId ?? null;
          if (!gymId && intent.orgId) {
            gymId = (await tx.gym.findFirst({ where: { orgId: intent.orgId }, orderBy: { createdAt: 'asc' }, select: { id: true } }))?.id ?? null;
          }
          if (!gymId) throw new BadRequestException('Gym context is required for slug changes');
          await tx.gym.update({ where: { id: gymId }, data: { slug: String(payload.slug ?? '') } });
          break;
        }
        case ChangeIntentType.TWO_SV_TOGGLE: {
          const enabled = Boolean(payload.enabled);
          await tx.user.update({
            where: { id: requester.id },
            data: {
              twoStepEmailEnabled: enabled,
              twoStepEmailEnabledAt: enabled ? confirmedAt : null,
              twoFactorEnabled: enabled,
              twoFactorMethod: enabled ? 'email' : null,
              twoFactorEnrolledAt: enabled ? confirmedAt : null,
            },
          });
          break;
        }
        case ChangeIntentType.BILLING_EMAIL_CHANGE:
          await tx.organization.update({ where: { id: intent.orgId ?? '' }, data: { billingEmail: String(payload.billingEmail ?? '') } });
          break;
      }
    });

    this.auditService.log({
      actor: { userId: requester.id, type: AuditActorType.USER, email: requester.email },
      tenantId,
      locationId: intent.gymId ?? null,
      action: 'SENSITIVE_CHANGE_COMPLETED',
      targetType: 'change_intent',
      targetId: intent.id,
      metadata: { type: intent.type },
      ip: meta?.ip ?? null,
      userAgent: meta?.userAgent ?? null,
    });
    await this.notificationService.createForUser({
      tenantId,
      locationId: intent.gymId,
      userId: requester.id,
      type: NotificationType.SYSTEM,
      title: 'Sensitive change completed',
      body: 'Your OTP-verified sensitive change has been applied.',
      metadata: { changeIntentId: intent.id, type: intent.type },
    });

    return { ok: true, id: intent.id, type: intent.type };
  }

  private async normalizePayload(userId: string, dto: CreateChangeIntentDto): Promise<Record<string, unknown>> {
    const payload = dto.payload ?? {};
    switch (dto.type) {
      case ChangeIntentType.PASSWORD_CHANGE: {
        const currentPassword = String(payload.currentPassword ?? '');
        const newPassword = String(payload.newPassword ?? '');
        if (!currentPassword || !newPassword || currentPassword === newPassword) throw new BadRequestException('Invalid password change request');
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
        if (!user || !(await bcrypt.compare(currentPassword, user.password))) throw new ForbiddenException('Unable to update password');
        return { newPasswordHash: await bcrypt.hash(newPassword, 10) };
      }
      case ChangeIntentType.EMAIL_CHANGE: {
        const newEmail = String(payload.newEmail ?? '').trim().toLowerCase();
        if (!newEmail.includes('@')) throw new BadRequestException('Invalid email');
        return { newEmail };
      }
      default:
        return payload;
    }
  }

  private async resolveTenantId(userId: string, orgId?: string | null, gymId?: string | null): Promise<string | null> {
    if (orgId) return orgId;
    if (gymId) {
      const gym = await this.prisma.gym.findUnique({ where: { id: gymId }, select: { orgId: true } });
      if (gym?.orgId) return gym.orgId;
    }
    return (await this.prisma.membership.findFirst({ where: { userId, status: MembershipStatus.ACTIVE }, select: { orgId: true } }))?.orgId
      ?? (await this.prisma.user.findUnique({ where: { id: userId }, select: { orgId: true } }))?.orgId
      ?? null;
  }

  async requestEnableTwoStepEmail(
    requester: { id: string; email: string },
    _dto: RequestEnableTwoStepEmailDto,
    meta?: SecurityRequestMeta,
  ): Promise<TwoStepOtpChallengeResponseDto> {
    return this.requestChange(requester, 'ENABLE_2SV_EMAIL', meta);
  }

  async verifyEnableTwoStepEmail(
    requester: { id: string; email: string },
    dto: VerifyEnableTwoStepEmailDto,
    _meta?: SecurityRequestMeta,
  ): Promise<TwoStepToggleResponseDto> {
    return this.verifyChange(requester, dto, 'ENABLE_2SV_EMAIL', true);
  }

  async requestDisableTwoStepEmail(
    requester: { id: string; email: string },
    _dto: RequestDisableTwoStepEmailDto,
    meta?: SecurityRequestMeta,
  ): Promise<TwoStepOtpChallengeResponseDto> {
    return this.requestChange(requester, 'DISABLE_2SV_EMAIL', meta);
  }

  async verifyDisableTwoStepEmail(
    requester: { id: string; email: string },
    dto: VerifyDisableTwoStepEmailDto,
    _meta?: SecurityRequestMeta,
  ): Promise<TwoStepToggleResponseDto> {
    return this.verifyChange(requester, dto, 'DISABLE_2SV_EMAIL', false);
  }

  private async requestChange(
    requester: { id: string; email: string },
    action: 'ENABLE_2SV_EMAIL' | 'DISABLE_2SV_EMAIL',
    meta?: SecurityRequestMeta,
  ): Promise<TwoStepOtpChallengeResponseDto> {
    const created = await this.createChangeIntent(requester, {
      type: ChangeIntentType.TWO_SV_TOGGLE,
      payload: { enabled: action === 'ENABLE_2SV_EMAIL' },
    }, meta);

    return {
      challengeId: created.id,
      expiresAt: created.expiresAt,
      resendAvailableAt: undefined,
      action,
      maskedEmail: created.maskedEmail,
    };
  }

  private async verifyChange(
    requester: { id: string; email: string },
    dto: VerifyEnableTwoStepEmailDto | VerifyDisableTwoStepEmailDto,
    expected: 'ENABLE_2SV_EMAIL' | 'DISABLE_2SV_EMAIL',
    nextEnabled: boolean,
  ): Promise<TwoStepToggleResponseDto> {
    await this.confirmChangeIntent(requester, dto.challengeId, { otp: dto.otp });
    return { success: true, twoStepEmailEnabled: nextEnabled, changedAt: new Date().toISOString() };
  }

  private generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  private hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***';
    return `${local.slice(0, 2)}***@${domain}`;
  }
}
