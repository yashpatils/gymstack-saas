import { Body, Controller, Get, NotFoundException, Param, ParseBoolPipe, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getPlatformAdminEmails, isPlatformAdmin } from '../auth/platform-admin.util';
import { RequirePlatformAdminGuard } from './require-platform-admin.guard';
import { AdminService } from './admin.service';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';

type RequestUser = {
  id: string;
};

@Controller('admin')
@VerifiedEmailRequired()
@UseGuards(RequirePlatformAdminGuard)
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





  @Get('audit')
  audit(
    @Query('tenantId') tenantId?: string,
    @Query('action') action?: string,
    @Query('actor') actor?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.adminService.listAudit({ tenantId, action, actor, from, to });
  }
  @Get('users')
  users(@Query('query') query?: string) {
    return this.adminService.searchUsers(query);
  }

  @Get('users/:id')
  async userDetail(@Param('id') id: string) {
    const user = await this.adminService.getUserDetail(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  @Post('users/:id/revoke-sessions')
  revokeSessions(@Param('id') id: string, @Req() req: { user: RequestUser }) {
    return this.adminService.revokeUserSessions(id, req.user.id);
  }

  @Get('impersonations')
  impersonations() {
    return this.adminService.listImpersonationHistory();
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
