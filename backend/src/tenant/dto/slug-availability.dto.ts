import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SlugAvailabilityQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  slug!: string;
}

export class SlugAvailabilityResponseDto {
  slug!: string;
  available!: boolean;
  reserved!: boolean;
  validFormat!: boolean;
  reason?: string;
}
