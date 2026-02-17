import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from '../audit/audit.module';
import { RolesGuard } from '../guards/roles.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { RequireVerifiedEmailGuard } from '../auth/require-verified-email.guard';
import { BillingController } from './billing.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { BillingService } from './billing.service';
import { SubscriptionGatingService } from './subscription-gating.service';
import { StripeBillingProvider } from './providers/stripe-billing.provider';
import { RazorpayBillingProvider } from './providers/razorpay-billing.provider';
import { BillingProviderRegistry } from './billing-provider.registry';

@Module({
  imports: [ConfigModule, PrismaModule, AuditModule],
  controllers: [BillingController, StripeWebhookController],
  providers: [
    RequireVerifiedEmailGuard,
    BillingService,
    SubscriptionGatingService,
    RolesGuard,
    StripeBillingProvider,
    RazorpayBillingProvider,
    BillingProviderRegistry,
  ],
  exports: [SubscriptionGatingService],
})
export class BillingModule {}
