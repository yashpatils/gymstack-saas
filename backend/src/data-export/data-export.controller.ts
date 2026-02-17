import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePlatformAdminGuard } from '../admin/require-platform-admin.guard';
import { DataExportService } from './data-export.service';

@Controller()
export class DataExportController {
  constructor(private readonly exportService: DataExportService) {}

  @VerifiedEmailRequired()
  @Get('export/tenant')
  exportTenant(@Req() req: { user: { id?: string; userId?: string; sub?: string } }) {
    return this.exportService.exportTenantForOwner(req.user.id ?? req.user.userId ?? req.user.sub ?? '');
  }

  @VerifiedEmailRequired()
  @Get('export/location/:locationId')
  exportLocation(@Req() req: { user: { id?: string; userId?: string; sub?: string } }, @Param('locationId') locationId: string) {
    return this.exportService.exportLocationForAdmin(req.user.id ?? req.user.userId ?? req.user.sub ?? '', locationId);
  }

  @UseGuards(JwtAuthGuard, RequirePlatformAdminGuard)
  @Get('admin/export/tenant/:tenantId')
  exportTenantAdmin(@Req() req: { user: { id?: string; userId?: string; sub?: string } }, @Param('tenantId') tenantId: string) {
    return this.exportService.exportTenantForPlatformAdmin(req.user.id ?? req.user.userId ?? req.user.sub ?? '', tenantId);
  }
}
