import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from '../audit/audit.module';
import { RolesGuard } from '../guards/roles.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { RequireVerifiedEmailGuard } from '../auth/require-verified-email.guard';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { SubscriptionGatingService } from './subscription-gating.service';

@Module({
  imports: [ConfigModule, PrismaModule, AuditModule],
  controllers: [BillingController],
  providers: [RequireVerifiedEmailGuard, BillingService, SubscriptionGatingService, RolesGuard],
  exports: [SubscriptionGatingService],
})
export class BillingModule {}
