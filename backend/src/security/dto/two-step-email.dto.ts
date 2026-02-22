import { IsOptional, IsString, MaxLength } from 'class-validator';
import { OtpVerifyDto } from '../../common/dto/otp.dto';

export class RequestEnableTwoStepEmailDto {
  @IsOptional()
  @IsString()
  @MaxLength(256)
  password?: string;
}

export class VerifyEnableTwoStepEmailDto extends OtpVerifyDto {}

export class RequestDisableTwoStepEmailDto {
  @IsOptional()
  @IsString()
  @MaxLength(256)
  password?: string;
}

export class VerifyDisableTwoStepEmailDto extends OtpVerifyDto {}

export class TwoStepOtpChallengeResponseDto {
  challengeId!: string;
  expiresAt!: string;
  resendAvailableAt?: string;
  action!: 'ENABLE_2SV_EMAIL' | 'DISABLE_2SV_EMAIL';
  maskedEmail!: string;
}

export class TwoStepToggleResponseDto {
  success!: true;
  twoStepEmailEnabled!: boolean;
  changedAt!: string;
}
