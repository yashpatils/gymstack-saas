import { BadRequestException, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

type RequestUser = {
  activeGymId?: string;
  activeLocationId?: string;
};

@Injectable()
export class RequireLocationContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const activeLocationId = request.user?.activeLocationId ?? request.user?.activeGymId;

    if (!activeLocationId) {
      throw new BadRequestException({
        code: 'NO_ACTIVE_LOCATION',
        message: 'An active location is required to access this resource.',
      });
    }

    return true;
  }
}
