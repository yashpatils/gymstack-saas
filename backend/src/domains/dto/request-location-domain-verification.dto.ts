import { IsOptional, IsString } from 'class-validator';

export class RequestLocationDomainVerificationDto {
  @IsString()
  locationId!: string;

  @IsOptional()
  @IsString()
  hostname?: string;

  @IsOptional()
  @IsString()
  customDomain?: string;
}
