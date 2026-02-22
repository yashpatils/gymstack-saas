import { OtpResendDto, OtpVerifyDto } from '../../common/dto/otp.dto';

export type LoginApiSuccessResponse = {
  status: 'SUCCESS';
  accessToken: string;
  refreshToken: string;
  user: unknown;
  memberships?: unknown[];
  activeContext?: unknown;
  requiresWorkspaceSelection?: boolean;
};

export class LoginOtpRequiredResponseDto {
  status!: 'OTP_REQUIRED';
  challengeRequired!: true;
  challengeId!: string;
  channel!: 'email';
  expiresAt!: string;
  resendAvailableAt?: string;
  maskedEmail!: string;
}

export type LoginApiOtpRequiredResponse = LoginOtpRequiredResponseDto;

export type LoginApiResponse = LoginApiSuccessResponse | LoginApiOtpRequiredResponse;

export class VerifyLoginOtpDto extends OtpVerifyDto {}
export class ResendLoginOtpDto extends OtpResendDto {}

// Backward-compatible aliases used in existing imports/tests.
export class VerifyLoginOtpBodyDto extends VerifyLoginOtpDto {}
export class ResendLoginOtpBodyDto extends ResendLoginOtpDto {}

export class ResendLoginOtpResponseDto {
  challengeId!: string;
  expiresAt!: string;
  resendAvailableAt?: string;
  channel!: 'email';
  maskedEmail!: string;
  resent!: true;
}
