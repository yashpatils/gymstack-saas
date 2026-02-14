import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailConfig } from './email.config';
import { EmailService } from './email.service';

@Module({
  imports: [ConfigModule],
  providers: [EmailConfig, EmailService],
  exports: [EmailService],
})
export class EmailModule {}
