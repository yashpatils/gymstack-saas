import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSupportTicketDto {
  @IsOptional()
  @IsString()
  @MaxLength(191)
  tenantId?: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MaxLength(191)
  subject!: string;

  @IsString()
  @MaxLength(4000)
  message!: string;
}
