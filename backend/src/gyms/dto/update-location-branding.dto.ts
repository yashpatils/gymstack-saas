import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateLocationBrandingDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  accentGradient?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  heroTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  heroSubtitle?: string;
}
