import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { DataExportType } from '@prisma/client';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';
import { RequirePlatformAdminGuard } from '../admin/require-platform-admin.guard';
import { DataExportService } from './data-export.service';

type RequestUser = { id?: string; userId?: string; sub?: string; activeTenantId?: string; orgId?: string };

@Controller()
export class DataExportController {
  constructor(private readonly exportService: DataExportService) {}

  @VerifiedEmailRequired()
  @UseGuards(JwtAuthGuard)
  @Post('exports')
  createJob(@Req() req: { user: RequestUser }, @Body() body: { type: DataExportType }) {
    return this.exportService.createExportJob(req.user, body.type);
  }

  @VerifiedEmailRequired()
  @UseGuards(JwtAuthGuard)
  @Get('exports')
  listJobs(@Req() req: { user: RequestUser }) {
    return this.exportService.listExportJobs(req.user);
  }

  @VerifiedEmailRequired()
  @UseGuards(JwtAuthGuard)
  @Get('exports/:id/download')
  download(@Req() req: { user: RequestUser }, @Param('id') id: string) {
    return this.exportService.getSignedDownloadUrl(req.user, id);
  }

  @Get('exports/files/:token')
  async openSignedDownload(@Param('token') token: string, @Res() res: Response) {
    const url = await this.exportService.resolveDownloadToken(token);
    return res.redirect(url);
  }

  @VerifiedEmailRequired()
  @UseGuards(JwtAuthGuard, RequirePlatformAdminGuard)
  @Post('admin/backups/tenant/:tenantId')
  createBackup(@Req() req: { user: RequestUser }, @Param('tenantId') tenantId: string) {
    const adminUserId = req.user.id ?? req.user.userId ?? req.user.sub ?? '';
    return this.exportService.createTenantBackup(adminUserId, tenantId);
  }

  @VerifiedEmailRequired()
  @UseGuards(JwtAuthGuard, RequirePlatformAdminGuard)
  @Get('admin/backups')
  listBackups() {
    return this.exportService.listBackups();
  }

  @VerifiedEmailRequired()
  @UseGuards(JwtAuthGuard, RequirePlatformAdminGuard)
  @Post('admin/backups/:id/restore/preview')
  previewRestore(@Param('id') id: string) {
    return this.exportService.restorePreview(id);
  }

  @VerifiedEmailRequired()
  @UseGuards(JwtAuthGuard, RequirePlatformAdminGuard)
  @Post('admin/backups/:id/restore')
  applyRestore(@Req() req: { user: RequestUser }, @Param('id') id: string, @Body() body: { confirmed: boolean }) {
    const adminUserId = req.user.id ?? req.user.userId ?? req.user.sub ?? '';
    return this.exportService.restoreApply(adminUserId, id, body.confirmed);
  }
}
