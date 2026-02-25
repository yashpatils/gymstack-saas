import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';
import { RequirePlatformAdminGuard } from '../admin/require-platform-admin.guard';
import { AnalyticsService } from './analytics.service';
import { AskAiDto } from './dto/ask-ai.dto';
import { User } from '../users/user.model';
import {
  AnalyticsLocationsQueryDto,
  AnalyticsRangeQueryDto,
  AnalyticsTopClassesQueryDto,
  AnalyticsTrendsQueryDto,
} from './dto/analytics-query.dto';
import { GymMetricsQueryDto, MetricsBackfillQueryDto } from './dto/metrics.dto';
import { PlanGatingGuard } from '../billing/plan-gating.guard';
import { RequirePlan } from '../billing/require-plan.decorator';

@Controller()
@UseGuards(JwtAuthGuard, PlanGatingGuard)
@VerifiedEmailRequired()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('admin/recompute-metrics')
  @UseGuards(RequirePlatformAdminGuard)
  recomputeMetrics(@Body() body: { date?: string }) {
    return this.analyticsService.recomputeDailyMetrics(body.date);
  }

  @Post('admin/metrics/backfill')
  @UseGuards(RequirePlatformAdminGuard)
  backfillMetrics(@Query() query: MetricsBackfillQueryDto) {
    return this.analyticsService.backfillDailyMetrics(query);
  }

  @Get('gyms/:gymId/metrics')
  getGymMetrics(@Req() req: { user: User }, @Param('gymId') gymId: string, @Query() query: GymMetricsQueryDto) {
    return this.analyticsService.getGymMetrics(req.user, gymId, query);
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

  @Get('analytics/overview')
  @RequirePlan('pro')
  getOverview(@Req() req: { user: User }, @Query() query: AnalyticsRangeQueryDto) {
    return this.analyticsService.getOverview(req.user, query.range ?? '7d');
  }

  @Get('analytics/locations')
  @RequirePlan('pro')
  getLocations(@Req() req: { user: User }, @Query() query: AnalyticsLocationsQueryDto) {
    return this.analyticsService.getLocations(req.user, {
      range: query.range ?? '7d',
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  }

  @Get('analytics/trends')
  @RequirePlan('pro')
  getTrends(@Req() req: { user: User }, @Query() query: AnalyticsTrendsQueryDto) {
    return this.analyticsService.getTrends(req.user, {
      metric: query.metric,
      range: query.range ?? '30d',
    });
  }

  @Get('analytics/top-classes')
  @RequirePlan('pro')
  getTopClasses(@Req() req: { user: User }, @Query() query: AnalyticsTopClassesQueryDto) {
    return this.analyticsService.getTopClassesAnalytics(req.user, {
      range: query.range ?? '30d',
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  }
}
