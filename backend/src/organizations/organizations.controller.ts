import { Body, Controller, ForbiddenException, Get, Patch, Req } from '@nestjs/common';
import { User } from '../users/user.model';
import { UpdateOrgDto } from './dto/update-org.dto';
import { UpdateWhiteLabelDto } from './dto/update-white-label.dto';
import { UpdateBillingProviderDto } from './dto/update-billing-provider.dto';
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

    return this.organizationsService.getDashboardSummary(user.id, tenantId);
  }

  @Get('growth-status')
  getGrowthStatus(@Req() req: { user?: User }) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    const tenantId = user.activeTenantId ?? user.orgId;
    if (!tenantId) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.organizationsService.getGrowthStatus(user.id, tenantId);
  }


  @Patch('white-label')
  updateWhiteLabel(@Req() req: { user?: User }, @Body() body: UpdateWhiteLabelDto) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    return this.organizationsService.updateWhiteLabel(user.activeTenantId ?? user.orgId, user.id, body.whiteLabelEnabled);
  }

  @Patch('billing-provider')
  updateBillingProvider(@Req() req: { user?: User }, @Body() body: UpdateBillingProviderDto) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    return this.organizationsService.updateBillingProvider(
      user.activeTenantId ?? user.orgId,
      user.id,
      body.billingProvider,
      body.billingCountry,
      body.billingCurrency,
    );
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
