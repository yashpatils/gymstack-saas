import { IsOptional, IsString } from 'class-validator';

export class CreateDomainDto {
  @IsString()
  hostname!: string;

  @IsOptional()
  @IsString()
  locationId?: string | null;
}
