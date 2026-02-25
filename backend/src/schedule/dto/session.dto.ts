import { IsDateString, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class DateRangeQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}

export class CreateSessionDto {
  @IsUUID()
  classId!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  capacityOverride?: number;
}

export class UpdateSessionDto {
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  capacityOverride?: number;
}

export class BookSessionDto {
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class CheckInDto {
  @IsUUID()
  userId!: string;
}

export class ScheduleQueryDto extends DateRangeQueryDto {
  @IsOptional()
  @IsIn(['true', 'false'])
  includeCanceled?: 'true' | 'false';
}
