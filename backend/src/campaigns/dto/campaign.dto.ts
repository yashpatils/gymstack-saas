import { CampaignSegmentType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GenerateCampaignDto {
  @IsEnum(CampaignSegmentType)
  segmentType!: CampaignSegmentType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  inactivityDays?: number;
}

export class SendCampaignDto {
  @IsOptional()
  @IsString()
  draftId?: string;

  @IsEnum(CampaignSegmentType)
  segmentType!: CampaignSegmentType;

  @IsString()
  subject!: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  inactivityDays?: number;
}
