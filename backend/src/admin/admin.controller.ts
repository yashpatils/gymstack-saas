import { Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePlatformAdminGuard } from './require-platform-admin.guard';
import { AdminService } from './admin.service';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';

@Controller('admin')
@VerifiedEmailRequired()
@UseGuards(JwtAuthGuard, RequirePlatformAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  overview() {
    return this.adminService.getOverview();
  }

  @Get('metrics')
  async metrics() {
    const overview = await this.adminService.getOverview();
    return {
      tenantsTotal: overview.totals.activeTenants,
      locationsTotal: 0,
      usersTotal: 0,
      signups7d: overview.trends.newTenants7d,
      signups30d: overview.trends.newTenants30d,
      activeMembershipsTotal: 0,
      mrr: overview.totals.mrrCents / 100,
      activeSubscriptions: overview.totals.activeSubscriptions,
    };
  }

  @Get('tenants')
  tenants(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('query') query?: string,
    @Query('status') status?: string,
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

  @Post('tenants/:tenantId/toggle-active')
  toggleTenantActive(
    @Param('tenantId') tenantId: string,
    @Req() req: { user: { userId?: string; id?: string; sub?: string } },
  ) {
    const adminId = req.user.userId ?? req.user.id ?? req.user.sub ?? '';
    return this.adminService.toggleTenantActive(tenantId, adminId);
  }

  @Post('impersonate')
  impersonate(
    @Body() body: { tenantId: string },
    @Req() req: { user: { userId?: string; id?: string; sub?: string }; ip?: string },
  ) {
    const adminId = req.user.userId ?? req.user.id ?? req.user.sub ?? '';
    return this.adminService.impersonateTenant(body.tenantId, adminId, req.ip);
  }
}
