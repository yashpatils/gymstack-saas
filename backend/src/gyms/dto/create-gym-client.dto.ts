import { ClientMembershipStatus } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateGymClientDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID()
  planId?: string;

  @IsOptional()
  @IsEnum(ClientMembershipStatus)
  status?: ClientMembershipStatus;
}
