import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type RequestUser = {
  id?: string;
  userId?: string;
};

type GuardRequest = {
  method?: string;
  path?: string;
  url?: string;
  originalUrl?: string;
  user?: RequestUser;
};

type AllowRule = {
  method?: string;
  exact?: string;
  prefix?: string;
};

const EMAIL_NOT_VERIFIED_ERROR = {
  message: 'Email not verified',
  code: 'EMAIL_NOT_VERIFIED',
} as const;

const VERIFIED_EMAIL_ALLOWLIST: AllowRule[] = [
  { method: 'POST', exact: '/api/auth/verify-email' },
  { method: 'POST', exact: '/auth/verify-email' },
  { method: 'POST', exact: '/api/auth/resend-verification' },
  { method: 'POST', exact: '/auth/resend-verification' },
  { method: 'POST', exact: '/api/auth/logout' },
  { method: 'POST', exact: '/auth/logout' },
  { method: 'GET', exact: '/api/auth/me' },
  { method: 'GET', exact: '/auth/me' },
  { method: 'GET', prefix: '/api/auth/oauth/google' },
  { method: 'GET', prefix: '/auth/oauth/google' },
  { method: 'GET', prefix: '/api/auth/oauth/apple' },
  { method: 'GET', prefix: '/auth/oauth/apple' },
  { method: 'POST', prefix: '/api/auth/oauth/apple' },
  { method: 'POST', prefix: '/auth/oauth/apple' },
  { prefix: '/api/public/' },
  { prefix: '/public/' },
  { method: 'GET', exact: '/api/invites/validate' },
  { method: 'GET', exact: '/invites/validate' },
  { method: 'POST', exact: '/api/invites/consume' },
  { method: 'POST', exact: '/invites/consume' },
  { method: 'GET', exact: '/api/health' },
  { method: 'GET', exact: '/health' },
  { method: 'GET', exact: '/api/status' },
  { method: 'GET', exact: '/status' },
];

function normalizePath(request: GuardRequest): string {
  const candidatePath = request.path ?? request.originalUrl ?? request.url ?? '/';
  const [pathOnly] = candidatePath.split('?');
  return pathOnly || '/';
}

function isAllowedRoute(method: string, path: string): boolean {
  return VERIFIED_EMAIL_ALLOWLIST.some((rule) => {
    if (rule.method && rule.method !== method) {
      return false;
    }

    if (rule.exact) {
      return rule.exact === path;
    }

    if (rule.prefix) {
      return path.startsWith(rule.prefix);
    }

    return false;
  });
}

@Injectable()
export class RequireVerifiedEmailGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<GuardRequest>();
    const userId = request.user?.id ?? request.user?.userId;

    if (!userId) {
      return true;
    }

    const method = request.method?.toUpperCase() ?? 'GET';
    const path = normalizePath(request);

    if (isAllowedRoute(method, path)) {
      return true;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerifiedAt: true, status: true },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid user');
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException(EMAIL_NOT_VERIFIED_ERROR);
    }

    return true;
  }
}
