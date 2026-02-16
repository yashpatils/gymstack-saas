import { ActiveMode } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class SetContextDto {
  @IsString()
  tenantId!: string;

  @IsOptional()
  @IsString()
  gymId?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsEnum(ActiveMode)
  mode?: ActiveMode;
}
