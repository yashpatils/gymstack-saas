import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { JobsModule } from '../jobs/jobs.module';
import { RequireVerifiedEmailGuard } from '../auth/require-verified-email.guard';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { InviteAdmissionService } from './invite-admission.service';

@Module({
  imports: [
    PrismaModule,
    JobsModule,
  ],
  controllers: [InvitesController],
  providers: [RequireVerifiedEmailGuard, InvitesService, InviteAdmissionService],
  exports: [InvitesService, InviteAdmissionService],
})
export class InvitesModule {}
