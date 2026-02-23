import { IsString, MinLength } from 'class-validator';

export class GymSlugAvailabilityQueryDto {
  @IsString()
  @MinLength(1)
  slug!: string;
}
