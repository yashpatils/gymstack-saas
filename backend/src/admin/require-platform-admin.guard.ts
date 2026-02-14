import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { isPlatformAdminUser } from '../auth/platform-admin.util';

type AuthenticatedRequestUser = {
  role?: string;
  email?: string;
};

@Injectable()
export class RequirePlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedRequestUser }>();
    if (!isPlatformAdminUser(request.user ?? {})) {
      throw new ForbiddenException('Platform admin access is required');
    }

    return true;
  }
}
