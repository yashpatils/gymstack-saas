import { MembershipPlanInterval } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateMembershipPlanDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;

  @IsEnum(MembershipPlanInterval)
  interval!: MembershipPlanInterval;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
