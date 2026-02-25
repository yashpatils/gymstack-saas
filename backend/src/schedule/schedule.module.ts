import { Module } from '@nestjs/common';
import { ScheduleController } from './schedule.controller';
import { ScheduleV2Controller } from './schedule-v2.controller';
import { ScheduleService } from './schedule.service';
import { PushModule } from '../push/push.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PushModule, WebhooksModule, AuditModule, NotificationsModule],
  controllers: [ScheduleController, ScheduleV2Controller],
  providers: [ScheduleService],
})
export class ScheduleModule {}
