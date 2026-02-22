import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RequestTenantSlugChangeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  newSlug!: string;
}

export class RequestTenantSlugChangeResponseDto {
  challengeId!: string;
  expiresAt!: string;
  resendAvailableAt?: string;
  pendingChangeType!: 'TENANT_SLUG';
  normalizedSlug!: string;
}
