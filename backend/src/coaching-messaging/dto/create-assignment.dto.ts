import { IsUUID } from 'class-validator';

export class CreateAssignmentDto {
  @IsUUID()
  locationId!: string;

  @IsUUID()
  coachUserId!: string;

  @IsUUID()
  clientUserId!: string;
}
