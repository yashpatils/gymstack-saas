import { Body, Controller, Get, Patch, Post, Param, Req, UseGuards } from '@nestjs/common';
import { FeatureFlagScope } from '@prisma/client';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';
import { User } from '../users/user.model';
import { FeatureFlagsService } from './feature-flags.service';
import { RequirePlatformAdminGuard } from '../admin/require-platform-admin.guard';

@Controller()
@VerifiedEmailRequired()
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get('feature-flags')
  getEffective(@Req() req: { user?: User }) {
    const tenantId = req.user?.activeTenantId ?? req.user?.orgId;
    const locationId = req.user?.activeGymId;
    return this.featureFlagsService.getEffectiveFlags(tenantId, locationId);
  }

  @Get('admin/feature-flags')
  @UseGuards(RequirePlatformAdminGuard)
  listAll() {
    return this.featureFlagsService.listAll();
  }

  @Post('admin/feature-flags')
  @UseGuards(RequirePlatformAdminGuard)
  create(
    @Req() req: { user?: User },
    @Body() body: { key: string; enabled?: boolean; scope?: FeatureFlagScope; tenantId?: string; locationId?: string },
  ) {
    return this.featureFlagsService.create({
      key: body.key,
      enabled: Boolean(body.enabled),
      scope: body.scope ?? FeatureFlagScope.GLOBAL,
      tenantId: body.tenantId,
      locationId: body.locationId,
      updatedByUserId: req.user?.id,
    });
  }

  @Patch('admin/feature-flags/:id')
  @UseGuards(RequirePlatformAdminGuard)
  update(
    @Param('id') id: string,
    @Req() req: { user?: User },
    @Body() body: { key?: string; enabled?: boolean; scope?: FeatureFlagScope; tenantId?: string | null; locationId?: string | null },
  ) {
    return this.featureFlagsService.update(id, {
      key: body.key,
      enabled: body.enabled,
      scope: body.scope,
      tenantId: body.tenantId,
      locationId: body.locationId,
      updatedByUserId: req.user?.id,
    });
  }
}
