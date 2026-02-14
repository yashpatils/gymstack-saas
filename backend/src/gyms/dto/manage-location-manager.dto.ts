import { IsEmail, IsOptional, IsString } from 'class-validator';

export class ManageLocationManagerDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
