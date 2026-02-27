import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { CoachingMessagingController } from './coaching-messaging.controller';
import { CoachingMessagingService } from './coaching-messaging.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [CoachingMessagingController],
  providers: [CoachingMessagingService],
  exports: [CoachingMessagingService],
})
export class CoachingMessagingModule {}
