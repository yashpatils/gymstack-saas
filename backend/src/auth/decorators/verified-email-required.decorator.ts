import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { RequireVerifiedEmailGuard } from '../guards/require-verified-email.guard';

export function VerifiedEmailRequired(): MethodDecorator & ClassDecorator {
  return applyDecorators(UseGuards(JwtAuthGuard, RequireVerifiedEmailGuard));
}
