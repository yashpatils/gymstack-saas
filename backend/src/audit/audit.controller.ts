import { Controller, ForbiddenException, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { User, UserRole } from '../users/user.model';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(UserRole.Owner, UserRole.Admin)
  listAuditLogs(
    @Req() req: { user?: User },
    @Query('limit') limit?: string,
  ) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    const parsedLimit = limit ? Number.parseInt(limit, 10) : 50;

    return this.auditService.listLatest(user.orgId, parsedLimit);
  }
}
