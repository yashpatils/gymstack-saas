import { ReleaseBuildStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateReleaseStatusDto {
  @IsString()
  @MaxLength(64)
  version!: string;

  @IsDateString()
  lastDeployAt!: string;

  @IsOptional()
  @IsEnum(ReleaseBuildStatus)
  buildStatus?: ReleaseBuildStatus;
}
