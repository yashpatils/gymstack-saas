import { Controller, Get, NotFoundException, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
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
  async whoami(@Req() req: { user: RequestUser }): Promise<{ email: string; platformRole: 'PLATFORM_ADMIN' | null; allowlistedEmailsCount: number }> {
    const user = await this.adminService.getUserById(req.user.id);
    const allowlistedEmails = getPlatformAdminEmails(this.configService);
    return {
      email: user?.email ?? '',
      platformRole: isPlatformAdmin(user?.email, allowlistedEmails) ? 'PLATFORM_ADMIN' : null,
      allowlistedEmailsCount: allowlistedEmails.length,
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

  @Get('tenants/:tenantId')
  async tenantDetail(@Param('tenantId') tenantId: string) {
    const tenant = await this.adminService.getTenant(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }
}
