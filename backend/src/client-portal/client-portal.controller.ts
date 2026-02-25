import { Controller, ForbiddenException, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientPortalService } from './client-portal.service';

@Controller('client')
@UseGuards(JwtAuthGuard)
export class ClientPortalController {
  constructor(private readonly clientPortalService: ClientPortalService) {}

  @Get('me')
  getMyClientPortal(@Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id;
    if (!userId) {
      throw new ForbiddenException('Missing user');
    }

    return this.clientPortalService.getClientPortal(userId);
  }
}
