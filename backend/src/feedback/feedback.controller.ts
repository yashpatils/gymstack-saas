import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { FeedbackPriority, FeedbackStatus, MembershipRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';
import { RequirePlatformAdminGuard } from '../admin/require-platform-admin.guard';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackService } from './feedback.service';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { CreateChangelogEntryDto } from './dto/create-changelog-entry.dto';
import { UpdateReleaseStatusDto } from './dto/update-release-status.dto';

type RequestUser = {
  id: string;
  activeTenantId?: string;
  activeRole?: MembershipRole;
  isPlatformAdmin?: boolean;
};

@Controller()
@UseGuards(JwtAuthGuard)
@VerifiedEmailRequired()
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('feedback')
  createFeedback(@Req() req: { user: RequestUser }, @Body() body: CreateFeedbackDto) {
    return this.feedbackService.createFeedback(req.user, body);
  }

  @Get('changelog')
  listChangelog(@Req() req: { user: RequestUser }) {
    return this.feedbackService.listChangelogForUser(req.user);
  }

  @Get('admin/feedback')
  @UseGuards(RequirePlatformAdminGuard)
  listFeedback(
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: FeedbackStatus,
    @Query('priority') priority?: FeedbackPriority,
  ) {
    return this.feedbackService.listFeedback({ tenantId, status, priority });
  }

  @Patch('admin/feedback/:id')
  @UseGuards(RequirePlatformAdminGuard)
  updateFeedback(@Param('id') id: string, @Body() body: UpdateFeedbackDto) {
    return this.feedbackService.updateFeedback(id, body);
  }

  @Get('admin/changelog')
  @UseGuards(RequirePlatformAdminGuard)
  listAdminChangelog() {
    return this.feedbackService.listChangelogAdmin();
  }

  @Post('admin/changelog')
  @UseGuards(RequirePlatformAdminGuard)
  createChangelog(@Body() body: CreateChangelogEntryDto) {
    return this.feedbackService.createChangelogEntry(body);
  }

  @Get('admin/release-status')
  @UseGuards(RequirePlatformAdminGuard)
  getReleaseStatus() {
    return this.feedbackService.getReleaseStatus();
  }

  @Post('admin/release-status')
  @UseGuards(RequirePlatformAdminGuard)
  updateReleaseStatus(@Body() body: UpdateReleaseStatusDto) {
    return this.feedbackService.updateReleaseStatus(body);
  }
}
