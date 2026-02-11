import { IsString, MinLength } from 'class-validator';

export class CreateGymDto {
  @IsString()
  @MinLength(2)
  name!: string;
}
