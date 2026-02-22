export type LoginApiSuccessResponse = {
  status: 'SUCCESS';
  accessToken: string;
  refreshToken: string;
  user: unknown;
  memberships?: unknown[];
  activeContext?: unknown;
  requiresWorkspaceSelection?: boolean;
};

export type LoginApiOtpRequiredResponse = {
  status: 'OTP_REQUIRED';
  challengeId: string;
  channel: 'email';
  expiresAt: string;
  resendAvailableAt?: string;
  maskedEmail: string;
};

export type LoginApiResponse = LoginApiSuccessResponse | LoginApiOtpRequiredResponse;

export class VerifyLoginOtpBodyDto {
  challengeId!: string;
  otp!: string;
}

export class ResendLoginOtpBodyDto {
  challengeId!: string;
}
