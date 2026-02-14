import { IsString, MinLength } from 'class-validator';

export class ConfirmDeleteDto {
  @IsString()
  @MinLength(10)
  token!: string;
}
