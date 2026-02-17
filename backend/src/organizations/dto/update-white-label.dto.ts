import { IsBoolean } from 'class-validator';

export class UpdateWhiteLabelDto {
  @IsBoolean()
  whiteLabelEnabled!: boolean;
}
