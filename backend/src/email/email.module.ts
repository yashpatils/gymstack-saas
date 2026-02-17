import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailConfig } from './email.config';
import { EmailService } from './email.service';
import { EmailQueueService } from './email-queue.service';

@Module({
  imports: [ConfigModule],
  providers: [EmailConfig, EmailService, EmailQueueService],
  exports: [EmailService, EmailQueueService],
})
export class EmailModule {}
