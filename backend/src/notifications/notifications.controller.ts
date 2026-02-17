import { Controller, ForbiddenException, Get, Param, Post, Query, Req } from '@nestjs/common';
import { User } from '../users/user.model';
import { NotificationsService } from './notifications.service';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';

@Controller('notifications')
@VerifiedEmailRequired()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  listNotifications(@Req() req: { user?: User }, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    const tenantId = user.supportMode?.tenantId ?? user.activeTenantId ?? user.orgId;
    if (!tenantId) {
      throw new ForbiddenException('No tenant context selected');
    }

    return this.notificationsService.listForUser(
      user.id,
      tenantId,
      Number(page ?? '1'),
      Number(pageSize ?? '20'),
    );
  }

  @Post(':id/read')
  markNotificationRead(@Param('id') id: string, @Req() req: { user?: User }) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    const tenantId = user.supportMode?.tenantId ?? user.activeTenantId ?? user.orgId;
    if (!tenantId) {
      throw new ForbiddenException('No tenant context selected');
    }

    return this.notificationsService.markAsRead(user.id, tenantId, id);
  }
}
