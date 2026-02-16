import { BadRequestException, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LocationAppService } from './location-app.service';
import { RequireLocationContextGuard } from './require-location-context.guard';

type RequestUser = {
  id: string;
  activeTenantId?: string;
  activeGymId?: string;
  activeLocationId?: string;
  activeRole?: MembershipRole;
};

type AuthenticatedRequest = Request & { user: RequestUser };

@Controller('location')
@UseGuards(JwtAuthGuard, RequireLocationContextGuard)
export class LocationAppController {
  constructor(private readonly locationAppService: LocationAppService) {}

  private getRequiredTenantId(req: AuthenticatedRequest): string {
    if (!req.user.activeTenantId) {
      throw new BadRequestException('Active tenant context is required.');
    }

    return req.user.activeTenantId;
  }

  private getRequiredLocationId(req: AuthenticatedRequest): string {
    const locationId = req.user.activeLocationId ?? req.user.activeGymId;
    if (!locationId) {
      throw new BadRequestException('Active location context is required.');
    }

    return locationId;
  }

  @Get('members')
  async getLocationMembers(@Req() req: AuthenticatedRequest) {
    this.locationAppService.assertStaffRole(req.user.activeRole);
    return this.locationAppService.getLocationMembers(
      this.getRequiredTenantId(req),
      this.getRequiredLocationId(req),
    );
  }

  @Post('members/:memberId/check-in')
  async checkInMember(@Req() req: AuthenticatedRequest, @Param('memberId') memberId: string) {
    this.locationAppService.assertStaffRole(req.user.activeRole);

    return this.locationAppService.createCheckIn(
      this.getRequiredTenantId(req),
      this.getRequiredLocationId(req),
      memberId,
      req.user.id,
    );
  }

  @Get('attendance/today')
  async getTodayAttendance(@Req() req: AuthenticatedRequest) {
    this.locationAppService.assertStaffRole(req.user.activeRole);

    return this.locationAppService.getTodayAttendance(
      this.getRequiredTenantId(req),
      this.getRequiredLocationId(req),
    );
  }

  @Get('me/attendance')
  async getMyAttendance(@Req() req: AuthenticatedRequest) {
    this.locationAppService.assertClientRole(req.user.activeRole);

    return this.locationAppService.getClientAttendance(
      this.getRequiredTenantId(req),
      this.getRequiredLocationId(req),
      req.user.id,
    );
  }
}
