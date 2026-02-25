import { ChangeIntentType } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString, Length } from 'class-validator';

export class CreateChangeIntentDto {
  @IsEnum(ChangeIntentType)
  type!: ChangeIntentType;

  @IsOptional()
  @IsString()
  orgId?: string;

  @IsOptional()
  @IsString()
  gymId?: string;

  @IsObject()
  payload!: Record<string, unknown>;
}

export class ConfirmChangeIntentDto {
  @IsString()
  @Length(6, 6)
  otp!: string;
}
