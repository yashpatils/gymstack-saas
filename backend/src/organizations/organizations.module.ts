import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { RequireVerifiedEmailGuard } from '../auth/require-verified-email.guard';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { OrgsController } from './orgs.controller';
import { TenantBillingController } from './tenant-billing.controller';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, BillingModule, AuditModule, NotificationsModule],
  controllers: [OrganizationsController, OrgsController, TenantBillingController],
  providers: [RequireVerifiedEmailGuard, OrganizationsService],
})
export class OrganizationsModule {}
