import { Body, Controller, Get, NotFoundException, Param, ParseBoolPipe, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminService } from './admin.service';
import { RequirePlatformAdminGuard } from './require-platform-admin.guard';

type RequestUser = { userId?: string; id?: string; sub?: string };

@Controller('admin')
@VerifiedEmailRequired()
@UseGuards(JwtAuthGuard, RequirePlatformAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  overview() {
    return this.adminService.getOverview();
  }

  @Get('growth')
  growth() {
    return this.adminService.getGrowthMetrics();
  }

  @Get('tenants')
  tenants(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('query') query?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.listTenants(page ?? 1, pageSize ?? 20, query, status);
  }

  @Get('audit')
  audit(@Query('tenantId') tenantId?: string, @Query('action') action?: string, @Query('actor') actor?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.adminService.listAudit({ tenantId, action, actor, from, to });
  }

  @Get('users')
  users(@Query('query') query?: string) {
    return this.adminService.searchUsers(query);
  }

  @Get('users/:id')
  async userDetail(@Param('id') id: string) {
    const user = await this.adminService.getUserDetail(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @Post('users/:id/revoke-sessions')
  revokeSessions(@Param('id') id: string, @Req() req: { user: RequestUser }) {
    return this.adminService.revokeUserSessions(id, req.user.id ?? req.user.userId ?? req.user.sub ?? '');
  }

  @Get('impersonations')
  impersonations() {
    return this.adminService.listImpersonationHistory();
  }

  @Post('tenants/:tenantId/features')
  setTenantFeatures(
    @Param('tenantId') tenantId: string,
    @Body('whiteLabelBranding', ParseBoolPipe) whiteLabelBranding: boolean,
    @Req() req: { user: RequestUser },
  ) {
    return this.adminService.setTenantFeatures(tenantId, { whiteLabelBranding }, req.user.id ?? req.user.userId ?? req.user.sub ?? '');
  }


  @Get('tenants/:tenantId/plan')
  tenantPlan(@Param('tenantId') tenantId: string) {
    return this.adminService.getTenantPlan(tenantId);
  }

  @Patch('tenants/:tenantId/plan')
  updateTenantPlan(
    @Param('tenantId') tenantId: string,
    @Body() body: { maxLocationsOverride?: number | null; maxStaffSeatsOverride?: number | null; whiteLabelOverride?: boolean | null },
    @Req() req: { user: RequestUser },
  ) {
    return this.adminService.updateTenantPlanOverrides(tenantId, body, req.user.id ?? req.user.userId ?? req.user.sub ?? '');
  }

  @Get('tenants/:tenantId')
  async tenantDetail(@Param('tenantId') tenantId: string) {
    const tenant = await this.adminService.getTenant(tenantId);
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  @Post('tenants/:tenantId/toggle-active')
  toggleTenantActive(@Param('tenantId') tenantId: string, @Req() req: { user: RequestUser }) {
    return this.adminService.toggleTenantActive(tenantId, req.user.userId ?? req.user.id ?? req.user.sub ?? '');
  }

  @Post('impersonate')
  impersonate(@Body() body: { tenantId: string }, @Req() req: { user: RequestUser; ip?: string }) {
    const adminId = req.user.userId ?? req.user.id ?? req.user.sub ?? '';
    return this.adminService.impersonateTenant(body.tenantId, adminId, req.ip);
  }
}
