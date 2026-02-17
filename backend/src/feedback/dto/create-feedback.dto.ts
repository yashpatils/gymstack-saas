import { FeedbackPriority } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFeedbackDto {
  @IsString()
  @MaxLength(2000)
  message!: string;

  @IsString()
  @MaxLength(300)
  page!: string;

  @IsEnum(FeedbackPriority)
  priority!: FeedbackPriority;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  taskId?: string;
}
