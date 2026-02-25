import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { RequirePermission } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../guards/permissions.guard';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';
import { CreateMembershipPlanDto } from './dto/create-membership-plan.dto';
import { UpdateMembershipPlanDto } from './dto/update-membership-plan.dto';
import { AssignClientMembershipDto } from './dto/assign-client-membership.dto';
import { UpdateClientMembershipDto } from './dto/update-client-membership.dto';
import { LocationMembershipsService } from './location-memberships.service';
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

@Controller()
@VerifiedEmailRequired()
@UseGuards(PermissionsGuard)
export class GymMembershipAdminController {
  constructor(private readonly locationMembershipsService: LocationMembershipsService) {}

  @Get('gyms/:gymId/plans')
  @RequirePermission('plans:crud')
  listPlans(@Req() req: AuthenticatedRequest, @Param('gymId') gymId: string) {
    return this.locationMembershipsService.listPlansForGym(this.requireUser(req), gymId);
  }

  @Post('gyms/:gymId/plans')
  @RequirePermission('plans:crud')
  createPlan(@Req() req: AuthenticatedRequest, @Param('gymId') gymId: string, @Body() body: CreateMembershipPlanDto) {
    return this.locationMembershipsService.createPlanForGym(this.requireUser(req), gymId, body);
  }

  @Patch('gyms/:gymId/plans/:planId')
  @RequirePermission('plans:crud')
  updatePlan(
    @Req() req: AuthenticatedRequest,
    @Param('gymId') gymId: string,
    @Param('planId') planId: string,
    @Body() body: UpdateMembershipPlanDto,
  ) {
    return this.locationMembershipsService.updatePlanForGym(this.requireUser(req), gymId, planId, body);
  }

  @Post('gyms/:gymId/clients/:userId/memberships')
  @RequirePermission('plans:crud')
  assignClientMembership(
    @Req() req: AuthenticatedRequest,
    @Param('gymId') gymId: string,
    @Param('userId') userId: string,
    @Body() body: AssignClientMembershipDto,
  ) {
    return this.locationMembershipsService.assignMembershipToClientForGym(this.requireUser(req), gymId, userId, body);
  }

  @Patch('client-memberships/:id')
  @RequirePermission('plans:crud')
  updateClientMembership(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: UpdateClientMembershipDto) {
    return this.locationMembershipsService.updateClientMembership(this.requireUser(req), id, body);
  }

  private requireUser(req: AuthenticatedRequest): NonNullable<AuthenticatedRequest['user']> {
    if (!req.user) {
      throw new ForbiddenException('Missing user');
    }

    return req.user;
  }
}
