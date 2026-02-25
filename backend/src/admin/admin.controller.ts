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

  @Get('analytics/overview')
  analyticsOverview() {
    return this.adminService.getAnalyticsOverview();
  }

  @Get('analytics/growth')
  analyticsGrowth(@Query('range') range?: string) {
    return this.adminService.getAnalyticsGrowth(range);
  }

  @Get('analytics/health')
  analyticsHealth() {
    return this.adminService.getAnalyticsHealth();
  }

  @Get('analytics/usage')
  analyticsUsage() {
    return this.adminService.getAnalyticsUsage();
  }

  @Get('ai/usage')
  aiUsage() {
    return this.adminService.getAiUsage();
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

  @Get('orgs')
  orgs(@Query('search') search?: string) {
    return this.adminService.listOrgs(search);
  }

  @Get('orgs/:id')
  async orgDetail(@Param('id') id: string) {
    const org = await this.adminService.getOrgDetail(id);
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  @Get('audit')
  audit(@Query('tenantId') tenantId?: string, @Query('action') action?: string, @Query('actor') actor?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('limit') limit?: string, @Query('cursor') cursor?: string) {
    return this.adminService.listAudit({ tenantId, action, actor, from, to, limit: limit ? Number.parseInt(limit, 10) : undefined, cursor });
  }

  @Get('ops/migration-status')
  migrationStatus() {
    return this.adminService.getMigrationStatus();
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

  @Get('integrations/api-keys')
  apiKeys(@Query('page', new ParseIntPipe({ optional: true })) page?: number, @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number) {
    return this.adminService.listApiKeys(page ?? 1, pageSize ?? 20);
  }

  @Post('integrations/api-keys/:id/revoke')
  revokeIntegrationApiKey(@Param('id') id: string) {
    return this.adminService.revokeApiKey(id);
  }

  @Get('integrations/webhook-failures')
  webhookFailures(@Query('page', new ParseIntPipe({ optional: true })) page?: number, @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number) {
    return this.adminService.listWebhookFailures(page ?? 1, pageSize ?? 20);
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
