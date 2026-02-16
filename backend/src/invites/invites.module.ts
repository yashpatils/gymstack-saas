import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { RequireVerifiedEmailGuard } from '../auth/require-verified-email.guard';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { InviteAdmissionService } from './invite-admission.service';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
  ],
  controllers: [InvitesController],
  providers: [RequireVerifiedEmailGuard, InvitesService, InviteAdmissionService],
  exports: [InvitesService, InviteAdmissionService],
})
export class InvitesModule {}
