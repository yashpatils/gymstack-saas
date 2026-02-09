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
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { User, UserRole } from '../users/user.model';
import { GymsService } from './gyms.service';

@Controller('gyms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GymsController {
  constructor(private readonly gymsService: GymsService) {}

  @Get()
  listGyms() {
    return this.gymsService.listGyms();
  }

  @Post()
  @Roles(UserRole.Owner, UserRole.Admin)
  createGym(@Body() data: Prisma.GymCreateInput, @Req() req: { user?: User }) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }
    return this.gymsService.createGym({
      name: data.name,
      owner: { connect: { id: user.id } },
    });
  }

  @Get(':id')
  getGym(@Param('id') id: string) {
    return this.gymsService.getGym(id);
  }

  @Patch(':id')
  @Roles(UserRole.Owner, UserRole.Admin)
  updateGym(
    @Param('id') id: string,
    @Body() data: Prisma.GymUpdateInput,
    @Req() req: { user?: User },
  ) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }
    return this.gymsService.updateGymForUser(id, data, user);
  }

  @Patch(':id/owner')
  @Roles(UserRole.Admin)
  updateGymOwner(
    @Param('id') id: string,
    @Body() data: Prisma.GymUpdateInput,
  ) {
    return this.gymsService.updateGym(id, data);
  }

  @Delete(':id')
  deleteGym(@Param('id') id: string, @Req() req: { user?: User }) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }
    return this.gymsService.deleteGymForUser(id, user);
  }
}
