import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { RequireVerifiedEmailGuard } from '../auth/require-verified-email.guard';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { TenantBillingController } from './tenant-billing.controller';

@Module({
  imports: [PrismaModule, BillingModule],
  controllers: [OrganizationsController, TenantBillingController],
  providers: [RequireVerifiedEmailGuard, OrganizationsService],
})
export class OrganizationsModule {}
