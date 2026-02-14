import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class LogoutDto {
  @IsOptional()
  @IsString()
  @MinLength(32)
  refreshToken?: string;

  @IsOptional()
  @IsBoolean()
  all?: boolean;
}
