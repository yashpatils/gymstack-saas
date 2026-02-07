import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.tenantId) {
      throw new UnauthorizedException('Missing tenant context');
    }

    request.tenantId = user.tenantId;
    return true;
  }
}
