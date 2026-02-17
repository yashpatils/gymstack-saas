import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { LocationMembershipsService } from './location-memberships.service';
import { User } from '../users/user.model';

type GuardRequest = {
  user: User & {
    activeTenantId?: string;
    activeGymId?: string;
    supportMode?: {
      tenantId: string;
      locationId?: string;
    };
  };
};

@Injectable()
export class ActiveClientMembershipGuard implements CanActivate {
  constructor(private readonly locationMembershipsService: LocationMembershipsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<GuardRequest>();
    await this.locationMembershipsService.assertClientHasActiveMembership(request.user);
    return true;
  }
}
