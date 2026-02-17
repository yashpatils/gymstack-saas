import { Body, Controller, ForbiddenException, Patch, Req } from '@nestjs/common';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';
import { User } from '../users/user.model';
import { OrganizationsService } from './organizations.service';
import { UpdateBillingProviderDto } from './dto/update-billing-provider.dto';

@Controller('tenant')
@VerifiedEmailRequired()
export class TenantBillingController {
  constructor(private readonly organizationsService: OrganizationsService) {}

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
}
