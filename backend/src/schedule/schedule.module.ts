import { Module } from '@nestjs/common';
import { ScheduleController } from './schedule.controller';
import { ScheduleV2Controller } from './schedule-v2.controller';
import { ScheduleService } from './schedule.service';
import { PushModule } from '../push/push.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [PushModule, WebhooksModule],
  controllers: [ScheduleController, ScheduleV2Controller],
  providers: [ScheduleService],
})
export class ScheduleModule {}
