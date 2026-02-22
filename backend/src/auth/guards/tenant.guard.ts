import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { MembershipRole, MembershipStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiErrorCode, apiError } from '../../common/api-error';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; user?: { userId?: string; isPlatformAdmin?: boolean }; activeTenantId?: string; membership?: { id: string; orgId: string; gymId: string | null; role: MembershipRole; status: MembershipStatus; userId: string } }>();
    const tenantId = request.headers['x-active-tenant-id'];

    if (!tenantId) {
      throw apiError(HttpStatus.BAD_REQUEST, ApiErrorCode.NO_ACTIVE_TENANT, 'X-Active-Tenant-Id header is required');
    }

    if (!request.user?.userId) {
      throw apiError(HttpStatus.UNAUTHORIZED, ApiErrorCode.UNAUTHORIZED, 'Missing authenticated user context');
    }

    if (request.user.isPlatformAdmin) {
      request.activeTenantId = tenantId;
      return true;
    }

    const membership = await this.prisma.membership.findFirst({
      where: { userId: request.user.userId, orgId: tenantId, status: MembershipStatus.ACTIVE },
      select: { id: true, orgId: true, gymId: true, role: true, status: true, userId: true },
    });

    if (!membership) {
      throw apiError(HttpStatus.FORBIDDEN, ApiErrorCode.FORBIDDEN, 'User does not have an active membership in this tenant');
    }

    request.activeTenantId = tenantId;
    request.membership = membership;
    return true;
  }
}

