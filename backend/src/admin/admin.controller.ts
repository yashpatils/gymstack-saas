import { Body, Controller, Get, NotFoundException, Param, ParseBoolPipe, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePlatformAdminGuard } from './require-platform-admin.guard';
import { AdminService } from './admin.service';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';

type RequestUser = { userId?: string; id?: string; sub?: string };

@Controller('admin')
@VerifiedEmailRequired()
@UseGuards(JwtAuthGuard, RequirePlatformAdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  overview() { return this.adminService.getOverview(); }

  @Get('tenants')
  tenants(@Query('page', new ParseIntPipe({ optional: true })) page?: number, @Query('query') query?: string) {
    return this.adminService.listTenants(page ?? 1, query);
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
  ) {
    return this.adminService.listTenants(page ?? 1, pageSize ?? 20, query, status);
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
  users(@Query('query') query?: string) { return this.adminService.searchUsers(query); }

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
    @Req() req: { user: { id: string } },
  ) {
    return this.adminService.setTenantFeatures(tenantId, { whiteLabelBranding }, req.user.id ?? req.user.userId ?? req.user.sub ?? '');
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

type RequestUser = {
  id: string;
};
