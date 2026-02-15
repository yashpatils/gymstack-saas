import { Body, Controller, Delete, ForbiddenException, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { User } from '../users/user.model';
import { GymsService } from './gyms.service';
import { ManageLocationManagerDto } from './dto/manage-location-manager.dto';

@Controller('locations')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class LocationManagersController {
  constructor(private readonly gymsService: GymsService) {}


  @Get(':locationId/branding')
  getBranding(@Param('locationId') locationId: string, @Req() req: { user?: User }) {
    if (!req.user) {
      throw new ForbiddenException('Missing user');
    }
    return this.gymsService.getLocationBranding(locationId, req.user);
  }

  @Get(':locationId/managers')
  getManagers(@Param('locationId') locationId: string, @Req() req: { user?: User }) {
    if (!req.user) {
      throw new ForbiddenException('Missing user');
    }
    return this.gymsService.listManagers(locationId, req.user);
  }

  @Post(':locationId/managers')
  addManager(
    @Param('locationId') locationId: string,
    @Body() body: ManageLocationManagerDto,
    @Req() req: { user?: User },
  ) {
    if (!req.user) {
      throw new ForbiddenException('Missing user');
    }
    return this.gymsService.addManager(locationId, body, req.user);
  }

  @Delete(':locationId/managers/:userId')
  deleteManager(@Param('locationId') locationId: string, @Param('userId') userId: string, @Req() req: { user?: User }) {
    if (!req.user) {
      throw new ForbiddenException('Missing user');
    }
    return this.gymsService.removeManager(locationId, userId, req.user);
  }
}
