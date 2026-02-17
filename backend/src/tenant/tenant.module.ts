import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { InvitesModule } from '../invites/invites.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';

@Module({
  imports: [PrismaModule, InvitesModule, AuditModule],
  controllers: [TenantController],
  providers: [TenantService],
})
export class TenantModule {}
