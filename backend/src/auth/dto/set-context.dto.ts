import { IsOptional, IsString } from 'class-validator';

export class SetContextDto {
  @IsString()
  tenantId!: string;

  @IsOptional()
  @IsString()
  gymId?: string;
}
