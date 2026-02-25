import { Module } from '@nestjs/common';
import { SecurityController } from './security.controller';
import { SecurityService } from './security.service';
import { OtpChallengeService } from './otp-challenge.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, EmailModule, AuditModule, NotificationsModule],
  controllers: [SecurityController],
  providers: [SecurityService, OtpChallengeService],
  exports: [SecurityService, OtpChallengeService],
})
export class SecurityModule {}
