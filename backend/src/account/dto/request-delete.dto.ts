import { IsString, MinLength } from 'class-validator';

export class RequestDeleteDto {
  @IsString()
  @MinLength(8)
  password!: string;
}
