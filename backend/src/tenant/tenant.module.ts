import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { InvitesModule } from '../invites/invites.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, InvitesModule, AuditModule, EmailModule, NotificationsModule],
  controllers: [TenantController],
  providers: [TenantService],
})
export class TenantModule {}
