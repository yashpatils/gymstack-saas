import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsBoolean()
  enableBilling?: boolean;

  @IsOptional()
  @IsBoolean()
  enableInvites?: boolean;

  @IsOptional()
  @IsBoolean()
  enableAudit?: boolean;
}
