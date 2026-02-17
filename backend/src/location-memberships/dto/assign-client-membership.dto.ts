import { ClientMembershipStatus } from '@prisma/client';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

export class AssignClientMembershipDto {
  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsEnum(ClientMembershipStatus)
  status?: ClientMembershipStatus;

  @IsOptional()
  @IsISO8601()
  startAt?: string;

  @ValidateIf((value: AssignClientMembershipDto) => value.status === ClientMembershipStatus.trialing)
  @IsOptional()
  @IsInt()
  @Min(1)
  trialDays?: number;
}
