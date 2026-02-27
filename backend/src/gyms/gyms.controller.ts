import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { User, UserRole } from '../users/user.model';
import { GymsService } from './gyms.service';
import { CreateGymDto } from './dto/create-gym.dto';
import { UpdateGymDto } from './dto/update-gym.dto';
import { GymSlugAvailabilityQueryDto } from './dto/slug-availability.dto';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';
import { InvitesService } from '../invites/invites.service';
import { CreateGymInviteDto } from '../invites/dto/create-gym-invite.dto';
import { CreateGymClientDto } from './dto/create-gym-client.dto';

@Controller('gyms')
@VerifiedEmailRequired()
@UseGuards(RolesGuard, PermissionsGuard)
export class GymsController {
  constructor(
    private readonly gymsService: GymsService,
    private readonly invitesService: InvitesService,
  ) {}

  @Get()
  listGyms(@Req() req: { user?: User }) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }
    return this.gymsService.listGyms(user.activeTenantId ?? user.orgId);
  }

  @Post()
  createGym(@Body() data: CreateGymDto, @Req() req: { user?: User }) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    return this.gymsService.createGymForUser({ ...user, orgId: user.activeTenantId ?? user.orgId }, data);
  }

  @Get('slug-availability')
  checkSlugAvailability(@Query() query: GymSlugAvailabilityQueryDto, @Req() req: { user?: User }) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    return this.gymsService.checkSlugAvailability(query.slug);
  }


  @Post(':gymId/invites')
  createGymInvite(@Param('gymId') gymId: string, @Body() body: CreateGymInviteDto, @Req() req: { user?: User }) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    return this.invitesService.createGymInvite(user, gymId, body);
  }

  @Get(':id')
  getGym(@Param('id') id: string, @Req() req: { user?: User }) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    return this.gymsService.getGymForUser(id, { ...user, orgId: user.activeTenantId ?? user.orgId });
  }

  @Get(':gymId/clients')
  @RequirePermission('clients:read')
  listGymClients(@Param('gymId') gymId: string, @Req() req: { user?: User }) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    return this.gymsService.listGymClients(user, gymId);
  }

  @Post(':gymId/clients')
  @RequirePermission('clients:crud')
  createGymClient(
    @Param('gymId') gymId: string,
    @Body() data: CreateGymClientDto,
    @Req() req: { user?: User },
  ) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    return this.gymsService.createGymClient(user, gymId, data);
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
