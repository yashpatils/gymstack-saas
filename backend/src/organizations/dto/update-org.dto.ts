import { IsString, MinLength } from 'class-validator';

export class UpdateOrgDto {
  @IsString()
  @MinLength(2)
  name!: string;
}
