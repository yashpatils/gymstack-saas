import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  gymName!: string;

  @IsString()
  size!: string;
}
