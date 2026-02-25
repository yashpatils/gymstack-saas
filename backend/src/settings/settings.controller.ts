import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { UserRole } from '../users/user.model';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { LocationGuard } from '../auth/guards/location.guard';
import { RolesGuard as MembershipRolesGuard } from '../auth/guards/roles.guard';
import { RequireRoles } from '../auth/require-roles.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from '../users/dto/change-password.dto';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';
import { UpdateLocationSettingsDto } from './dto/update-location-settings.dto';

type AuthenticatedRequest = {
  user?: {
    id?: string;
    role?: UserRole;
  };
};

@Controller()
@VerifiedEmailRequired()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('settings')
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch('settings')
  updateSettings(@Req() req: AuthenticatedRequest, @Body() body: UpdateSettingsDto) {
    if (req.user?.role !== UserRole.Owner) {
      throw new ForbiddenException('Only owners can update settings');
    }

    return this.settingsService.updateSettings(body);
  }

  @Get('users/me')
  getMyProfile(@Req() req: AuthenticatedRequest) {
    if (!req.user?.id) {
      throw new ForbiddenException('Missing user');
    }

    return this.settingsService.getMyProfile(req.user.id);
  }

  @Patch('users/me')
  updateMyProfile(@Req() req: AuthenticatedRequest, @Body() body: UpdateProfileDto) {
    if (!req.user?.id) {
      throw new ForbiddenException('Missing user');
    }

    return this.settingsService.updateMyProfile(req.user.id, body);
  }

  @Post('users/me/change-password')
  changeMyPassword(@Req() req: AuthenticatedRequest, @Body() body: ChangePasswordDto) {
    if (!req.user?.id) {
      throw new ForbiddenException('Missing user');
    }

    if (body.currentPassword === body.newPassword) {
      throw new BadRequestException('Unable to update password');
    }

    throw new BadRequestException('Password changes require OTP confirmation. Use /api/security/change-intents.');
  }

  @Get('orgs/:id/settings')
  @UseGuards(TenantGuard, MembershipRolesGuard)
  @RequireRoles(MembershipRole.TENANT_OWNER, MembershipRole.TENANT_LOCATION_ADMIN)
  getOrganizationSettings(@Param('id') id: string, @Req() req: { activeTenantId?: string }) {
    if (req.activeTenantId !== id) {
      throw new ForbiddenException('Not authorized');
    }

    return this.settingsService.getOrganizationSettings(id);
  }

  @Patch('orgs/:id/settings')
  @UseGuards(TenantGuard, MembershipRolesGuard)
  @RequireRoles(MembershipRole.TENANT_OWNER, MembershipRole.TENANT_LOCATION_ADMIN)
  updateOrganizationSettings(
    @Param('id') id: string,
    @Body() body: UpdateOrganizationSettingsDto,
    @Req() req: { activeTenantId?: string },
  ) {
    if (req.activeTenantId !== id) {
      throw new ForbiddenException('Not authorized');
    }

    throw new BadRequestException('Organization setting changes require OTP confirmation. Use /api/security/change-intents.');
  }

  @Get('gyms/:id/settings')
  @UseGuards(LocationGuard, MembershipRolesGuard)
  @RequireRoles(MembershipRole.TENANT_OWNER, MembershipRole.TENANT_LOCATION_ADMIN)
  getLocationSettings(@Param('id') id: string, @Req() req: { activeLocationId?: string }) {
    if (req.activeLocationId !== id) {
      throw new ForbiddenException('Not authorized');
    }

    return this.settingsService.getLocationSettings(id);
  }

  @Patch('gyms/:id/settings')
  @UseGuards(LocationGuard, MembershipRolesGuard)
  @RequireRoles(MembershipRole.TENANT_OWNER, MembershipRole.TENANT_LOCATION_ADMIN)
  updateLocationSettings(
    @Param('id') id: string,
    @Body() body: UpdateLocationSettingsDto,
    @Req() req: { activeLocationId?: string },
  ) {
    if (req.activeLocationId !== id) {
      throw new ForbiddenException('Not authorized');
    }

    throw new BadRequestException('Location setting changes require OTP confirmation. Use /api/security/change-intents.');
  }
}
