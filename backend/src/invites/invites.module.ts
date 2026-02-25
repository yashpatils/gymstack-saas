import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { JobsModule } from '../jobs/jobs.module';
import { BillingModule } from '../billing/billing.module';
import { RequireVerifiedEmailGuard } from '../auth/require-verified-email.guard';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { InviteAdmissionService } from './invite-admission.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    JobsModule,
    BillingModule,
    AuditModule,
    NotificationsModule,
  ],
  controllers: [InvitesController],
  providers: [RequireVerifiedEmailGuard, InvitesService, InviteAdmissionService],
  exports: [InvitesService, InviteAdmissionService],
})
export class InvitesModule {}
