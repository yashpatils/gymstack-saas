import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class OtpVerifyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  challengeId!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be a 6-digit code' })
  otp!: string;
}

export class OtpResendDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  challengeId!: string;
}
