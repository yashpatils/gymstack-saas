import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { User, UserRole } from '../users/user.model';
import { GymsService } from './gyms.service';
import { CreateGymDto } from './dto/create-gym.dto';
import { UpdateGymDto } from './dto/update-gym.dto';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermission } from '../auth/permissions.decorator';

@Controller('gyms')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class GymsController {
  constructor(private readonly gymsService: GymsService) {}

  @Get()
  listGyms(@Req() req: { user?: User }) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }
    return this.gymsService.listGyms(user.activeTenantId ?? user.orgId);
  }

  @Post()
  @RequirePermission('gym:create')
  createGym(@Body() data: CreateGymDto, @Req() req: { user?: User }) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    return this.gymsService.createGymForUser({ ...user, orgId: user.activeTenantId ?? user.orgId }, data.name);
  }

  @Get(':id')
  getGym(@Param('id') id: string, @Req() req: { user?: User }) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    return this.gymsService.getGymForUser(id, { ...user, orgId: user.activeTenantId ?? user.orgId });
  }

  @Patch(':id')
  updateGym(
    @Param('id') id: string,
    @Body() data: UpdateGymDto,
    @Req() req: { user?: User },
  ) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }
    return this.gymsService.updateGymForUser(id, data, { ...user, orgId: user.activeTenantId ?? user.orgId });
  }

  @Patch(':id/owner')
  @Roles(UserRole.Admin)
  updateGymOwner(
    @Param('id') id: string,
    @Body() data: UpdateGymDto,
    @Req() req: { user?: User },
  ) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    return this.gymsService.updateGym(id, user.activeTenantId ?? user.orgId, data);
  }

  @Delete(':id')
  deleteGym(@Param('id') id: string, @Req() req: { user?: User }) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }
    return this.gymsService.deleteGymForUser(id, { ...user, orgId: user.activeTenantId ?? user.orgId });
  }
}
