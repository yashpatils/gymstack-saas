import { Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePlatformAdminGuard } from './require-platform-admin.guard';
import { AdminService } from './admin.service';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';

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

  @Get('tenants/:tenantId')
  async tenantDetail(@Param('tenantId') tenantId: string) {
    const tenant = await this.adminService.getTenant(tenantId);
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  @Post('tenants/:tenantId/toggle-active')
  toggleTenantActive(@Param('tenantId') tenantId: string, @Req() req: { user: { userId?: string; id?: string; sub?: string } }) {
    return this.adminService.toggleTenantActive(tenantId, req.user.userId ?? req.user.id ?? req.user.sub ?? '');
  }

  @Get('api-usage')
  apiUsage() { return this.adminService.getApiUsageByTenant(); }

  @Post('api-keys/:keyId/disable')
  disableApiKey(@Param('keyId') keyId: string) { return this.adminService.disableApiKey(keyId); }

  @Get('webhook-failures')
  webhookFailures() { return this.adminService.getWebhookFailures(); }

  @Get('users')
  users(@Query('query') query?: string) { return this.adminService.searchUsers(query); }

  @Get('users/:id')
  async userDetail(@Param('id') id: string) {
    const user = await this.adminService.getUserDetail(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @Post('users/:id/revoke-sessions')
  revokeSessions(@Param('id') id: string) { return this.adminService.revokeUserSessions(id); }

  @Get('audit')
  audit() { return this.adminService.listAudit(); }

  @Post('impersonate')
  impersonate(@Body() body: { tenantId: string }, @Req() req: { user: { userId?: string; id?: string; sub?: string }; ip?: string }) {
    return this.adminService.impersonateTenant(body.tenantId, req.user.userId ?? req.user.id ?? req.user.sub ?? '', req.ip);
  }
}
