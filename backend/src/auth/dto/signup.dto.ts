import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export enum SignupRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsEnum(SignupRole)
  role?: SignupRole;

  @IsOptional()
  @IsString()
  inviteToken?: string;

  @IsOptional()
  @IsString()
  referralCode?: string;
}
