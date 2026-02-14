import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export enum OwnerOpsChoice {
  OWNER_IS_MANAGER = 'OWNER_IS_MANAGER',
  INVITE_MANAGER = 'INVITE_MANAGER',
}

export class OwnerOpsModeDto {
  @IsString()
  tenantId!: string;

  @IsString()
  locationId!: string;

  @IsEnum(OwnerOpsChoice)
  choice!: OwnerOpsChoice;

  @IsOptional()
  @IsEmail()
  managerEmail?: string;

  @IsOptional()
  @IsString()
  managerName?: string;
}
