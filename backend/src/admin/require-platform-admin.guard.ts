import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAllowlistedPlatformAdminEmail } from '../auth/platform-admin.util';

type AuthenticatedRequestUser = {
  role?: string;
  email?: string;
};

@Injectable()
export class RequirePlatformAdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedRequestUser }>();
    const isPlatformAdmin = isAllowlistedPlatformAdminEmail(this.configService, request.user?.email);
    if (!isPlatformAdmin) {
      throw new ForbiddenException('Platform admin access is required');
    }

    return true;
  }
}
