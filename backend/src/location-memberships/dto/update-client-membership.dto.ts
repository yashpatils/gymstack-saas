import { ClientMembershipStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class UpdateClientMembershipDto {
  @IsEnum(ClientMembershipStatus)
  status!: ClientMembershipStatus;

  @IsOptional()
  @IsBoolean()
  adminOverride?: boolean;
}
