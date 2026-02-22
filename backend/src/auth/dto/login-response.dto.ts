import { MembershipRole } from '@prisma/client';
import { MeDto, MembershipDto } from './me.dto';
import { LoginOtpRequiredResponseDto } from './login-otp.dto';

export class LoginSuccessResponseDto {
  status!: 'SUCCESS';
  accessToken!: string;
  refreshToken!: string;
  user!: MeDto;
  memberships!: MembershipDto[];
  activeContext?: { tenantId: string; gymId?: string | null; locationId?: string | null; role: MembershipRole };
  emailDeliveryWarning?: string;
}

export type LoginResponseUnion = LoginSuccessResponseDto | LoginOtpRequiredResponseDto;
