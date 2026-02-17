import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { RequirePlatformAdminGuard } from '../admin/require-platform-admin.guard';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, RequirePlatformAdminGuard],
})
export class AnalyticsModule {}
