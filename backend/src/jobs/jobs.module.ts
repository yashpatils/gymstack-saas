import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../prisma/prisma.module';
import { JobLogService } from './job-log.service';
import { JobsService } from './jobs.service';

@Module({
  imports: [PrismaModule, EmailModule],
  providers: [JobLogService, JobsService],
  exports: [JobLogService, JobsService],
})
export class JobsModule {}
