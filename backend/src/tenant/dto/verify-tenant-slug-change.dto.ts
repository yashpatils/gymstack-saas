import { OtpVerifyDto } from '../../common/dto/otp.dto';

export class VerifyTenantSlugChangeDto extends OtpVerifyDto {}

export class VerifyTenantSlugChangeResponseDto {
  success!: true;
  tenantId!: string;
  oldSlug!: string;
  newSlug!: string;
  changedAt!: string;
}
