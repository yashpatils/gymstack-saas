import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { UserRole } from '../users/user.model';

@Controller('gyms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GymsController {
  @Post()
  @Roles(UserRole.Owner)
  createGym(
    @Body() _body: Record<string, unknown>,
  ): { success: true } {
    return { success: true };
  }
}
