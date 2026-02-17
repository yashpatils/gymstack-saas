import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { RequirePermission } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../guards/permissions.guard';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';
import { LocationMembershipsService } from './location-memberships.service';
import { CreateMembershipPlanDto } from './dto/create-membership-plan.dto';
import { UpdateMembershipPlanDto } from './dto/update-membership-plan.dto';
import { AssignClientMembershipDto } from './dto/assign-client-membership.dto';
import { ActiveClientMembershipGuard } from './active-client-membership.guard';
import { User } from '../users/user.model';

type AuthenticatedRequest = {
  user?: User & {
    activeTenantId?: string;
    activeGymId?: string;
    supportMode?: {
      tenantId: string;
      locationId?: string;
    };
  };
};

@Controller('location')
@VerifiedEmailRequired()
@UseGuards(PermissionsGuard)
export class LocationMembershipsController {
  constructor(private readonly locationMembershipsService: LocationMembershipsService) {}

  @Get('plans')
  @RequirePermission('plans:crud')
  listPlans(@Req() req: AuthenticatedRequest) {
    return this.locationMembershipsService.listPlans(this.requireUser(req));
  }

  @Post('plans')
  @RequirePermission('plans:crud')
  createPlan(@Req() req: AuthenticatedRequest, @Body() body: CreateMembershipPlanDto) {
    return this.locationMembershipsService.createPlan(this.requireUser(req), body);
  }

  @Patch('plans/:planId')
  @RequirePermission('plans:crud')
  updatePlan(@Req() req: AuthenticatedRequest, @Param('planId') planId: string, @Body() body: UpdateMembershipPlanDto) {
    return this.locationMembershipsService.updatePlan(this.requireUser(req), planId, body);
  }

  @Get('clients/:userId/membership')
  @RequirePermission('clients:read')
  getClientMembership(@Req() req: AuthenticatedRequest, @Param('userId') userId: string) {
    return this.locationMembershipsService.getClientMembershipForStaff(this.requireUser(req), userId);
  }

  @Post('clients/:userId/membership')
  @RequirePermission('plans:crud')
  assignClientMembership(@Req() req: AuthenticatedRequest, @Param('userId') userId: string, @Body() body: AssignClientMembershipDto) {
    return this.locationMembershipsService.assignMembershipToClient(this.requireUser(req), userId, body);
  }

  @Get('me/membership')
  @RequirePermission('self:read/write')
  getMyMembership(@Req() req: AuthenticatedRequest) {
    return this.locationMembershipsService.getMyMembership(this.requireUser(req));
  }

  @Get('me/booking-access')
  @RequirePermission('self:read/write')
  @UseGuards(ActiveClientMembershipGuard)
  getBookingAccess() {
    return { allowed: true };
  }

  private requireUser(req: AuthenticatedRequest): NonNullable<AuthenticatedRequest['user']> {
    if (!req.user) {
      throw new ForbiddenException('Missing user');
    }

    return req.user;
  }
}
