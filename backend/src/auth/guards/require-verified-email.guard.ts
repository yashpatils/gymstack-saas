import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

type GuardRequest = {
  user?: {
    emailVerifiedAt?: string | Date | null;
  };
};

@Injectable()
export class RequireVerifiedEmailGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<GuardRequest>();
    if (!request.user) {
      return true;
    }

    if (!request.user.emailVerifiedAt) {
      throw new ForbiddenException(EMAIL_NOT_VERIFIED_ERROR);
    }

    return true;
  }
}

const EMAIL_NOT_VERIFIED_ERROR = {
  message: 'Email not verified',
  code: 'EMAIL_NOT_VERIFIED',
} as const;
