import { IsDateString, IsEmail, IsIn } from 'class-validator';

export class CreateGymInviteDto {
  @IsEmail()
  email!: string;

  @IsIn(['COACH', 'STAFF', 'LOCATION_ADMIN'])
  role!: 'COACH' | 'STAFF' | 'LOCATION_ADMIN';

  @IsDateString()
  expiresAt!: string;
}
