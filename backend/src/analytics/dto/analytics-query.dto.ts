import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export const ANALYTICS_RANGES = ['7d', '30d'] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export class AnalyticsRangeQueryDto {
  @IsOptional()
  @IsIn(ANALYTICS_RANGES)
  range?: AnalyticsRange;
}

export class AnalyticsLocationsQueryDto extends AnalyticsRangeQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export const ANALYTICS_TREND_METRICS = ['bookings', 'checkins', 'memberships'] as const;
export type AnalyticsTrendMetric = (typeof ANALYTICS_TREND_METRICS)[number];

export class AnalyticsTrendsQueryDto {
  @IsIn(ANALYTICS_TREND_METRICS)
  metric!: AnalyticsTrendMetric;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? '30d' : value))
  @IsIn(['30d'])
  range?: '30d';
}

export class AnalyticsTopClassesQueryDto extends AnalyticsRangeQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
