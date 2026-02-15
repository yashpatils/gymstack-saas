import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../auth/permissions.decorator';
import { hasPermission } from '../auth/permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: { permissions?: string[]; isPlatformAdmin?: boolean; supportMode?: { tenantId: string; locationId?: string } } }>();

    if (request.user?.isPlatformAdmin && request.user.supportMode) {
      return true;
    }

    const permissions = request.user?.permissions ?? [];

    const allowed = requiredPermissions.every((requiredPermission) => hasPermission(permissions, requiredPermission));
    if (!allowed) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
