import { Injectable } from '@nestjs/common';

export type CreatePendingChangeChallengeInput = {
  userId: string;
  tenantId?: string | null;
  targetType: 'TENANT_SETTINGS' | 'USER_SETTINGS';
  changeType: 'TENANT_SLUG' | 'TENANT_NAME' | 'PRIMARY_EMAIL' | 'ENABLE_2SV_EMAIL' | 'DISABLE_2SV_EMAIL';
  payload: Record<string, unknown>;
  emailTo: string;
  emailSubjectLabel: string;
  ip?: string;
  userAgent?: string;
};

export type CreatePendingChangeChallengeResult = {
  challengeId: string;
  otp: string;
  expiresAt: Date;
  resendAvailableAt?: Date;
};

export type VerifyPendingChangeChallengeInput = {
  challengeId: string;
  userId: string;
  otp: string;
  expectedTenantId?: string | null;
  expectedChangeType?: string;
};

export type VerifyPendingChangeChallengeResult = {
  id: string;
  userId: string;
  tenantId?: string | null;
  changeType: string;
  payload: Record<string, unknown>;
  consumedAt?: Date | null;
};

export type ResendPendingChangeChallengeInput = {
  challengeId: string;
  userId: string;
  expectedTenantId?: string | null;
  expectedChangeType?: string;
  emailTo: string;
  emailSubjectLabel: string;
  ip?: string;
  userAgent?: string;
};

export type ResendPendingChangeChallengeResult = {
  challengeId: string;
  otp: string;
  expiresAt: Date;
  resendAvailableAt?: Date;
};

@Injectable()
export class OtpChallengeService {
  async createPendingChangeChallenge(_input: CreatePendingChangeChallengeInput): Promise<CreatePendingChangeChallengeResult> {
    throw new Error('Not implemented');
  }

  async verifyPendingChangeChallenge(_input: VerifyPendingChangeChallengeInput): Promise<VerifyPendingChangeChallengeResult> {
    throw new Error('Not implemented');
  }

  async resendPendingChangeChallenge(_input: ResendPendingChangeChallengeInput): Promise<ResendPendingChangeChallengeResult> {
    throw new Error('Not implemented');
  }

  async createLoginOtpChallenge(_input: {
    userId: string;
    emailTo: string;
    purpose: 'LOGIN_2SV' | 'ADMIN_LOGIN_2SV';
    tenantId?: string | null;
    tenantSlug?: string | null;
    adminOnly?: boolean;
    ip?: string;
    userAgent?: string;
  }): Promise<{ challengeId: string; otp: string; expiresAt: Date; resendAvailableAt?: Date; maskedEmail: string }> {
    throw new Error('Not implemented');
  }

  async verifyLoginOtpChallenge(_input: {
    challengeId: string;
    otp: string;
  }): Promise<{ userId: string; tenantId?: string | null; tenantSlug?: string | null; adminOnly: boolean; purpose: 'LOGIN_2SV' | 'ADMIN_LOGIN_2SV' }> {
    throw new Error('Not implemented');
  }

  async resendLoginOtpChallenge(_input: {
    challengeId: string;
    ip?: string;
    userAgent?: string;
  }): Promise<{ challengeId: string; otp: string; expiresAt: Date; resendAvailableAt?: Date; maskedEmail: string }> {
    throw new Error('Not implemented');
  }
}
