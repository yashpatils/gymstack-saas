import { IsString } from 'class-validator';

export class VerifyLocationDomainDto {
  @IsString()
  locationId!: string;
}
