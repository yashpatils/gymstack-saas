import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateLocationSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;
}
