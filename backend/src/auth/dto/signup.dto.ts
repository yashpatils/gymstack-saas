import { Role } from '@prisma/client';

export class SignupDto {
  email: string;
  password: string;
  role?: Role;
}
