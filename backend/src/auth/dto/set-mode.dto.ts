import { ActiveMode } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class SetModeDto {
  @IsString()
  tenantId!: string;

  @IsEnum(ActiveMode)
  mode!: ActiveMode;

  @IsOptional()
  @IsString()
  locationId?: string;
}
