import { Controller, ForbiddenException, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { User } from '../users/user.model';
import { NotificationsService } from './notifications.service';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';

@Controller('notifications')
@VerifiedEmailRequired()
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
