import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { MembershipRole, MembershipStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiErrorCode, apiError } from '../../common/api-error';

@Injectable()
export class LocationGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; user?: { userId?: string; isPlatformAdmin?: boolean }; activeTenantId?: string; activeLocationId?: string; membership?: { id: string; orgId: string; gymId: string | null; role: MembershipRole; status: MembershipStatus; userId: string } }>();
    const locationId = request.headers['x-active-location-id'];

    if (!locationId) {
      throw apiError(HttpStatus.BAD_REQUEST, ApiErrorCode.NO_ACTIVE_LOCATION, 'X-Active-Location-Id header is required');
    }

    if (!request.user?.userId) {
      throw apiError(HttpStatus.UNAUTHORIZED, ApiErrorCode.UNAUTHORIZED, 'Missing authenticated user context');
    }

    if (request.user.isPlatformAdmin) {
      request.activeLocationId = locationId;
      return true;
    }

    const location = await this.prisma.gym.findUnique({ where: { id: locationId }, select: { orgId: true } });
    if (!location) {
      throw apiError(HttpStatus.FORBIDDEN, ApiErrorCode.FORBIDDEN, 'Invalid location context');
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: request.user.userId,
        orgId: location.orgId,
        status: MembershipStatus.ACTIVE,
        OR: [{ gymId: locationId }, { role: MembershipRole.TENANT_OWNER }],
      },
      select: { id: true, orgId: true, gymId: true, role: true, status: true, userId: true },
    });

    if (!membership) {
      throw apiError(HttpStatus.FORBIDDEN, ApiErrorCode.FORBIDDEN, 'User does not have access to this location');
    }

    request.activeTenantId = location.orgId;
    request.activeLocationId = locationId;
    request.membership = membership;
    return true;
  }
}

