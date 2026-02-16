import { Controller, ForbiddenException, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequireVerifiedEmailGuard } from '../auth/require-verified-email.guard';
import { User } from '../users/user.model';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RequireVerifiedEmailGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  listNotifications(@Req() req: { user?: User }) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    return this.notificationsService.listForUser(user.id, 20);
  }

  @Post(':id/read')
  markNotificationRead(@Param('id') id: string, @Req() req: { user?: User }) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    return this.notificationsService.markAsRead(user.id, id);
  }
}
