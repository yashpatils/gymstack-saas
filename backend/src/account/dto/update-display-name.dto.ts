import { IsString, Length } from 'class-validator';

export class UpdateDisplayNameDto {
  @IsString()
  @Length(1, 80)
  name!: string;
}
