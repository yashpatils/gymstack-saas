import { IsEmail, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateInviteDto {
  @IsString()
  tenantId!: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsIn(['TENANT_LOCATION_ADMIN', 'GYM_STAFF_COACH', 'CLIENT'])
  role!: 'TENANT_LOCATION_ADMIN' | 'GYM_STAFF_COACH' | 'CLIENT';

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  expiresInDays?: number;
}
