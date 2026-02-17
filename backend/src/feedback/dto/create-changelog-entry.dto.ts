import { ChangelogAudience } from '@prisma/client';
import { IsEnum, IsString, MaxLength } from 'class-validator';

export class CreateChangelogEntryDto {
  @IsString()
  @MaxLength(140)
  title!: string;

  @IsString()
  @MaxLength(3000)
  description!: string;

  @IsEnum(ChangelogAudience)
  audience!: ChangelogAudience;
}
