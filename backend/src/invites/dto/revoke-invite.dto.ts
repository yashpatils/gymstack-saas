import { IsString } from 'class-validator';

export class RevokeInviteDto {
  @IsString()
  inviteId!: string;
}
