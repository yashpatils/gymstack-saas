import {
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
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { User, UserRole } from './user.model';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.Admin)
  listUsers() {
    return this.usersService.listUsers();
  }

  @Get(':id')
  getUser(@Param('id') id: string, @Req() req: { user?: User }) {
    const user = req.user;
    if (!user || (user.role !== UserRole.Admin && user.id !== id)) {
      throw new ForbiddenException('Insufficient role');
    }
    return this.usersService.getUser(id);
  }

  @Patch(':id')
  updateUser(
    @Param('id') id: string,
    @Body() data: Prisma.UserUpdateInput,
    @Req() req: { user?: User },
  ) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }
    return this.usersService.updateUserForRequester(id, data, user);
  }

  @Delete(':id')
  @Roles(UserRole.Admin)
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
