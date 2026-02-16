import { Body, Controller, ForbiddenException, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { User } from '../users/user.model';
import { UpdateOrgDto } from './dto/update-org.dto';
import { OrganizationsService } from './organizations.service';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';

@Controller('org')
@VerifiedEmailRequired()
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  getOrg(@Req() req: { user?: User }) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    return this.organizationsService.getOrg(user.activeTenantId ?? user.orgId);
  }


  @Get('dashboard-summary')
  getDashboardSummary(@Req() req: { user?: User }) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    return this.organizationsService.getDashboardSummary(user.id, user.activeTenantId ?? user.orgId);
  }

  @Get('dashboard/summary')
  getDashboardSummary(@Req() req: { user?: User }) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    const tenantId = user.activeTenantId ?? user.orgId;
    if (!tenantId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.organizationsService.getDashboardSummary(tenantId, user.id);
  }

  @Patch()
  renameOrg(@Req() req: { user?: User }, @Body() body: UpdateOrgDto) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    return this.organizationsService.renameOrg(user.activeTenantId ?? user.orgId, user.id, body.name);
  }
}
