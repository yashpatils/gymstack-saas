import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { RequirePlatformAdminGuard } from '../admin/require-platform-admin.guard';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [BillingModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, RequirePlatformAdminGuard],
})
export class AnalyticsModule {}
