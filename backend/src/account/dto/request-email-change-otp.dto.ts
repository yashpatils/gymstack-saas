import { IsEmail } from 'class-validator';

export class RequestEmailChangeOtpDto {
  @IsEmail()
  newEmail!: string;
}
