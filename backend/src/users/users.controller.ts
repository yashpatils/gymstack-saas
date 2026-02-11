import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './user.model';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.Owner, UserRole.Admin, UserRole.Member, UserRole.User)
  listUsers(@Req() req: { user?: User }) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    return this.usersService.listUsers(user.orgId);
  }

  @Get('me')
  getCurrentUser(@Req() req: { user?: User }) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    return this.usersService.getCurrentUser(user.id);
  }

  @Get(':id')
  @Roles(UserRole.Owner, UserRole.Admin, UserRole.Member, UserRole.User)
  getUser(@Param('id') id: string, @Req() req: { user?: User }) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }
    return this.usersService.getUser(id, user.orgId);
  }

  @Patch(':id')
  @Roles(UserRole.Owner, UserRole.Admin)
  updateUser(
    @Param('id') id: string,
    @Body() data: UpdateUserDto,
    @Req() req: { user?: User },
  ) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }
    return this.usersService.updateUserForRequester(id, user.orgId, data, user);
  }

  @Delete(':id')
  @Roles(UserRole.Owner, UserRole.Admin)
  deleteUser(@Param('id') id: string, @Req() req: { user?: User }) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    return this.usersService.deleteUser(id, user.orgId, user.id);
  }

  @Patch('me/password')
  changeMyPassword(
    @Body() body: ChangePasswordDto,
    @Req() req: { user?: User },
  ) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    if (body.currentPassword === body.newPassword) {
      throw new BadRequestException('Unable to update password');
    }

    return this.usersService.changeOwnPassword(
      user.id,
      body.currentPassword,
      body.newPassword,
    );
  }
}
