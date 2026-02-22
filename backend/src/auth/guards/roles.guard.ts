import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MembershipRole } from '@prisma/client';
import { REQUIRE_MEMBERSHIP_ROLES_KEY } from '../require-roles.decorator';
import { roleCanAccessRole } from '../role-policy';
import { ApiErrorCode, apiError } from '../../common/api-error';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<MembershipRole[]>(REQUIRE_MEMBERSHIP_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ membership?: { role?: MembershipRole }; user?: { activeRole?: MembershipRole; isPlatformAdmin?: boolean } }>();
    if (request.user?.isPlatformAdmin) {
      return true;
    }

    const actorRole = request.membership?.role ?? request.user?.activeRole;
    if (!actorRole) {
      throw apiError(HttpStatus.FORBIDDEN, ApiErrorCode.FORBIDDEN, 'No active membership role available');
    }

    const allowed = requiredRoles.some((requiredRole) => roleCanAccessRole(actorRole, requiredRole));
    if (!allowed) {
      throw apiError(HttpStatus.FORBIDDEN, ApiErrorCode.FORBIDDEN, 'Insufficient permissions');
    }

    return true;
  }
}

