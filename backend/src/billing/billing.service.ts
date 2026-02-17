import {
  BadRequestException,
  Injectable,
  Logger,
  NotImplementedException,
} from '@nestjs/common';
import { BillingProvider } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionGatingService } from './subscription-gating.service';
import { PlanService } from './plan.service';
import { BillingProviderRegistry } from './billing-provider.registry';
import { TenantBillingStatus } from './billing.types';

type CheckoutPayload = {
  tenantId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionGatingService: SubscriptionGatingService,
    private readonly planService: PlanService,
    private readonly billingProviderRegistry: BillingProviderRegistry,
  ) {}

  private async getTenantProvider(tenantId: string) {
    const tenant = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      select: { id: true, billingProvider: true, isDemo: true },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found.');
    }
    if (tenant.isDemo) {
      throw new BadRequestException('Billing is disabled in demo mode.');
    }

    return this.billingProviderRegistry.getProvider(tenant.billingProvider);
  }

  async createCheckoutSession(payload: CheckoutPayload): Promise<{ url: string }> {
    const provider = await this.getTenantProvider(payload.tenantId);
    return provider.createCheckout(payload);
  }

  async createPortalSession(tenantId: string, returnUrl: string): Promise<{ url: string }> {
    const provider = await this.getTenantProvider(tenantId);

    if (!provider.createPortal) {
      throw new NotImplementedException('Billing portal is not available for this provider. Contact support.');
    }

    return provider.createPortal({ tenantId, returnUrl });
  }

  async getTenantBillingStatus(tenantId: string): Promise<TenantBillingStatus> {
    const tenant = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      select: {
        billingProvider: true,
        billingCountry: true,
        billingPriceId: true,
        stripePriceId: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        whiteLabelEnabled: true,
        isDemo: true,
      },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found.');
    }
    if (tenant.isDemo) {
      throw new BadRequestException('Billing is disabled in demo mode.');
    }

    const effectivePriceId = tenant.billingPriceId ?? tenant.stripePriceId;
    const effectivePlan = await this.planService.getEffectivePlan(tenantId);
    const whiteLabelEligible = effectivePlan.whiteLabelIncluded && (effectivePlan.subscriptionStatus === 'ACTIVE' || effectivePlan.subscriptionStatus === 'TRIAL');

    return {
      provider: tenant.billingProvider,
      billingCountry: tenant.billingCountry,
      planKey: effectivePlan.key,
      planName: effectivePlan.displayName,
      subscriptionStatus: tenant.subscriptionStatus,
      currentPeriodEnd: tenant.currentPeriodEnd ? tenant.currentPeriodEnd.toISOString() : null,
      priceId: effectivePriceId,
      whiteLabelEligible,
      whiteLabelEnabled: tenant.whiteLabelEnabled,
      usage: {
        locationsUsed: effectivePlan.usage.locationsUsed,
        maxLocations: effectivePlan.maxLocations,
        staffSeatsUsed: effectivePlan.usage.staffSeatsUsed,
        maxStaffSeats: effectivePlan.maxStaffSeats,
      },
    };
  }

  async handleStripeWebhook(payload: Buffer, signature?: string | string[]) {
    const provider = this.billingProviderRegistry.getProvider(BillingProvider.STRIPE);
    const event = await provider.parseWebhook(payload, signature);
    await provider.syncFromEvent(event);
    return { received: true };
  }

  async handleRazorpayWebhook(payload: Buffer, signature?: string | string[]) {
    const provider = this.billingProviderRegistry.getProvider(BillingProvider.RAZORPAY);
    const event = await provider.parseWebhook(payload, signature);
    await provider.syncFromEvent(event);
    return { received: true };
  }

  async updateTenantProvider(
    tenantId: string,
    billingProvider: BillingProvider,
    billingCountry?: string,
    billingCurrency?: string,
  ): Promise<{ billingProvider: BillingProvider }> {
    await this.prisma.organization.update({
      where: { id: tenantId },
      data: {
        billingProvider,
        billingCountry: billingCountry?.toUpperCase(),
        billingCurrency: billingCurrency?.toUpperCase(),
      },
      select: { id: true },
    });

    this.logger.log(`Updated billing provider for tenant ${tenantId} to ${billingProvider}`);
    return { billingProvider };
  }
}
