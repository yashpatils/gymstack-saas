import type { ActiveContext, AuthMeResponse, AuthUser } from '../types/auth';

export type { ActiveContext, AuthUser };

export type AuthMembership = AuthMeResponse['memberships'];

export type LoginOptions = {
  tenantId?: string;
  tenantSlug?: string;
  adminOnly?: boolean;
};

export type LoginSuccessResult = {
  status: 'SUCCESS';
  token: string;
  user: AuthUser;
  memberships: AuthMembership;
  activeContext?: ActiveContext;
  emailDeliveryWarning?: string;
};

export type LoginOtpRequiredResult = {
  status: 'OTP_REQUIRED';
  challengeId: string;
  channel: 'email';
  expiresAt: string;
  resendAvailableAt?: string;
  maskedEmail: string;
};

export type FrontendLoginResult = LoginSuccessResult | LoginOtpRequiredResult;

export type VerifyLoginOtpResult = LoginSuccessResult;

export type ResendLoginOtpResult = {
  challengeId: string;
  expiresAt: string;
  resendAvailableAt?: string;
  channel: 'email';
  maskedEmail: string;
  resent: true;
};
