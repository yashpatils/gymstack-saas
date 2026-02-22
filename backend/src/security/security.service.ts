import { BadRequestException, Injectable } from '@nestjs/common';
import { PendingChangeTargetType, PendingChangeType } from '@prisma/client';
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
  ) {}

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
    const now = new Date();
    const otp = this.generateOtp();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_SECONDS * 1000);
    const resendAvailableAt = new Date(now.getTime() + RESEND_COOLDOWN_SECONDS * 1000);

    await this.prisma.pendingSensitiveChange.updateMany({
      where: { userId: requester.id, changeType: action as PendingChangeType, consumedAt: null, cancelledAt: null },
      data: { cancelledAt: now },
    });

    const challenge = await this.prisma.pendingSensitiveChange.create({
      data: {
        userId: requester.id,
        targetType: PendingChangeTargetType.USER_SETTINGS,
        changeType: action as PendingChangeType,
        payloadJson: {},
        otpHash: this.hashOtp(otp),
        otpExpiresAt: expiresAt,
        resendAvailableAt,
        lastSentAt: now,
        requestedFromIp: meta?.ip,
        requestedUserAgent: meta?.userAgent,
      },
    });

    await this.emailService.sendTemplatedActionEmail({
      to: requester.email,
      template: action === 'ENABLE_2SV_EMAIL' ? 'enable_2sv_otp' : 'disable_2sv_otp',
      subject: action === 'ENABLE_2SV_EMAIL' ? 'Enable Gymstack 2-step verification' : 'Disable Gymstack 2-step verification',
      title: action === 'ENABLE_2SV_EMAIL' ? 'Enable two-step verification' : 'Disable two-step verification',
      intro: `Use this one-time code: ${otp}. It expires in ${Math.floor(OTP_EXPIRY_SECONDS / 60)} minutes.`,
      buttonLabel: 'Open settings',
      link: '/platform/settings',
    });

    return {
      challengeId: challenge.id,
      expiresAt: expiresAt.toISOString(),
      resendAvailableAt: resendAvailableAt.toISOString(),
      action,
      maskedEmail: this.maskEmail(requester.email),
    };
  }

  private async verifyChange(
    requester: { id: string; email: string },
    dto: VerifyEnableTwoStepEmailDto | VerifyDisableTwoStepEmailDto,
    expected: 'ENABLE_2SV_EMAIL' | 'DISABLE_2SV_EMAIL',
    nextEnabled: boolean,
  ): Promise<TwoStepToggleResponseDto> {
    const challenge = await this.prisma.pendingSensitiveChange.findFirst({
      where: { id: dto.challengeId, userId: requester.id, changeType: expected as PendingChangeType, consumedAt: null, cancelledAt: null },
    });
    if (!challenge) throw new BadRequestException('Challenge not found');
    if (challenge.otpExpiresAt <= new Date()) throw new BadRequestException('OTP expired');
    if (challenge.attempts >= challenge.maxAttempts) throw new BadRequestException('Maximum attempts exceeded');
    if (this.hashOtp(dto.otp) !== challenge.otpHash) {
      await this.prisma.pendingSensitiveChange.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException('Invalid OTP');
    }

    const changedAt = new Date();
    await this.prisma.$transaction([
      this.prisma.pendingSensitiveChange.update({ where: { id: challenge.id }, data: { consumedAt: changedAt } }),
      this.prisma.user.update({
        where: { id: requester.id },
        data: {
          twoStepEmailEnabled: nextEnabled,
          twoStepEmailEnabledAt: nextEnabled ? changedAt : null,
          twoFactorEnabled: nextEnabled,
          twoFactorMethod: nextEnabled ? 'email' : null,
          twoFactorEnrolledAt: nextEnabled ? changedAt : null,
        },
      }),
    ]);

    return { success: true, twoStepEmailEnabled: nextEnabled, changedAt: changedAt.toISOString() };
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
