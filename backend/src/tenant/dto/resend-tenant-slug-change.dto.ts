import { OtpResendDto } from '../../common/dto/otp.dto';

export class ResendTenantSlugChangeOtpDto extends OtpResendDto {}

export class ResendTenantSlugChangeOtpResponseDto {
  challengeId!: string;
  expiresAt!: string;
  resendAvailableAt?: string;
  resent!: true;
}
