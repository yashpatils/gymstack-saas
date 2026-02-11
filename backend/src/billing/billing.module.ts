import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RolesGuard } from '../guards/roles.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { SubscriptionGatingService } from './subscription-gating.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [BillingController],
  providers: [BillingService, SubscriptionGatingService, RolesGuard],
  exports: [SubscriptionGatingService],
})
export class BillingModule {}
