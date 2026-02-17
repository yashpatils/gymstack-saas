import { Module } from '@nestjs/common';
import { RequirePlatformAdminGuard } from '../admin/require-platform-admin.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';

@Module({
  imports: [PrismaModule],
  controllers: [FeedbackController],
  providers: [FeedbackService, RequirePlatformAdminGuard],
})
export class FeedbackModule {}
