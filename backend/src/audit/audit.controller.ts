import { Controller, ForbiddenException, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { User, UserRole } from '../users/user.model';
import { AuditService } from './audit.service';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';

@Controller('audit')
@VerifiedEmailRequired()
@UseGuards(RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(UserRole.Owner, UserRole.Admin)
  listAuditLogs(
    @Req() req: { user?: User },
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('actor') actor?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('cursor') cursor?: string,
  ) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    const parsedLimit = limit ? Number.parseInt(limit, 10) : 50;

    const tenantId = user.activeTenantId ?? user.orgId;
    return this.auditService.listLatest(tenantId, parsedLimit, { action, actor, from, to, cursor });
  }
}
