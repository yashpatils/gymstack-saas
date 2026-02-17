import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { RequirePlatformAdminGuard } from './require-platform-admin.guard';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [PrismaModule, JobsModule, WebhooksModule],
  controllers: [AdminController],
  providers: [AdminService, RequirePlatformAdminGuard],
})
export class AdminModule {}
