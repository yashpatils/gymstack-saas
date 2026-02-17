import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { MembershipRole } from '@prisma/client';

export class UpdateMemberDto {
  @IsOptional()
  @IsEnum(MembershipRole)
  role?: MembershipRole;

  @IsOptional()
  @IsString()
  locationId?: string | null;

  @IsOptional()
  @IsBoolean()
  remove?: boolean;
}
