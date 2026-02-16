import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ConfigureLocationDomainDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  customDomain!: string;
}
