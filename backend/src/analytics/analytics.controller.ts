import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';
import { RequirePlatformAdminGuard } from '../admin/require-platform-admin.guard';
import { AnalyticsService } from './analytics.service';
import { AskAiDto } from './dto/ask-ai.dto';
import { User } from '../users/user.model';

@Controller()
@UseGuards(JwtAuthGuard)
@VerifiedEmailRequired()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('admin/recompute-metrics')
  @UseGuards(RequirePlatformAdminGuard)
  recomputeMetrics(@Body() body: { date?: string }) {
    return this.analyticsService.recomputeDailyMetrics(body.date);
  }

  @Get('platform/insights')
  listInsights(@Req() req: { user: User }, @Query('locationId') locationId?: string) {
    return this.analyticsService.listInsightHistory(req.user, locationId);
  }

  @Post('platform/insights/generate')
  generateInsights(@Req() req: { user: User }, @Body() body: { locationId?: string }) {
    return this.analyticsService.generateInsights(req.user, body.locationId);
  }

  @Post('ai/ask')
  ask(@Req() req: { user: User }, @Body() body: AskAiDto) {
    return this.analyticsService.ask(req.user, body);
  }
}
