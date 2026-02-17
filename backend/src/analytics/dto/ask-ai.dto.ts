import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export enum AskScope {
  TENANT = 'TENANT',
  LOCATION = 'LOCATION',
}

export class AskAiDto {
  @IsString()
  @MaxLength(600)
  question!: string;

  @IsEnum(AskScope)
  scope!: AskScope;

  @IsOptional()
  @IsUUID()
  locationId?: string;
}
