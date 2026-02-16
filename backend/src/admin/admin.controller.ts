import { Body, Controller, Get, NotFoundException, Param, ParseBoolPipe, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { getPlatformAdminEmails, isPlatformAdmin } from '../auth/platform-admin.util';
import { RequirePlatformAdminGuard } from './require-platform-admin.guard';
import { AdminService } from './admin.service';

type RequestUser = {
  id: string;
};

@Controller('admin')
@UseGuards(JwtAuthGuard, RequirePlatformAdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
  ) {}

  @Get('whoami')
  async whoami(@Req() req: { user: RequestUser }): Promise<{ email: string; isPlatformAdmin: boolean; platformRole: 'PLATFORM_ADMIN' | null }> {
    const user = await this.adminService.getUserById(req.user.id);
    const allowlistedEmails = getPlatformAdminEmails(this.configService);
    const isPlatformAdminUser = isPlatformAdmin(user?.email, allowlistedEmails);

    return {
      email: user?.email ?? '',
      isPlatformAdmin: isPlatformAdminUser,
      platformRole: isPlatformAdminUser ? 'PLATFORM_ADMIN' : null,
    };
  }

  @Get('metrics')
  metrics() {
    return this.adminService.getMetrics();
  }

  @Get('tenants')
  tenants(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('query') query?: string,
  ) {
    return this.adminService.listTenants(page ?? 1, pageSize ?? 20, query);
  }



  @Post('tenants/:tenantId/features')
  async setTenantFeatures(
    @Param('tenantId') tenantId: string,
    @Body('whiteLabelBranding', ParseBoolPipe) whiteLabelBranding: boolean,
    @Req() req: { user: RequestUser },
  ) {
    return this.adminService.setTenantFeatures(tenantId, { whiteLabelBranding }, req.user.id);
  }

  @Get('tenants/:tenantId')
  async tenantDetail(@Param('tenantId') tenantId: string) {
    const tenant = await this.adminService.getTenant(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }
}
