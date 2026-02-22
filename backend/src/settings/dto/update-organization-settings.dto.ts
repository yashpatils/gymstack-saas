import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOrganizationSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsBoolean()
  whiteLabelEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  billingCountry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  billingCurrency?: string;
}
