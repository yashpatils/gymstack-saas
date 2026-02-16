import { IsString } from 'class-validator';

export class RequestLocationDomainVerificationDto {
  @IsString()
  locationId!: string;

  @IsString()
  hostname!: string;
}
