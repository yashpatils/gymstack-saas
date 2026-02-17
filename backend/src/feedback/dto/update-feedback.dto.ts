import { FeedbackCategory, FeedbackStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateFeedbackDto {
  @IsOptional()
  @IsEnum(FeedbackStatus)
  status?: FeedbackStatus;

  @IsOptional()
  @IsEnum(FeedbackCategory)
  category?: FeedbackCategory;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  taskId?: string;
}
