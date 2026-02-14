import { IsEmail, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateInviteDto {
  @IsString()
  locationId!: string;

  @IsIn(['GYM_STAFF_COACH', 'CLIENT'])
  role!: 'GYM_STAFF_COACH' | 'CLIENT';

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24 * 30)
  expiresInHours?: number;
}
