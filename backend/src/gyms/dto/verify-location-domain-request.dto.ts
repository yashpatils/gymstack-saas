import { IsBoolean, IsOptional } from 'class-validator';

export class VerifyLocationDomainRequestDto {
  @IsOptional()
  @IsBoolean()
  manualVerify?: boolean;
}
