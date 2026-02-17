import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionGatingService } from './subscription-gating.service';

type CheckoutPayload = {
  tenantId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
};

type TenantBillingStatus = {
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  priceId: string | null;
  whiteLabelEligible: boolean;
  whiteLabelEnabled: boolean;
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripe?: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly subscriptionGatingService: SubscriptionGatingService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      this.logger.warn('Stripe is not configured. Missing STRIPE_SECRET_KEY.');
      return;
    }

    this.stripe = new Stripe(secretKey);
  }

  private ensureStripeConfigured(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Stripe integration is disabled. Set STRIPE_SECRET_KEY.');
    }

    return this.stripe;
  }

  private getAllowedPriceIds(): Set<string> {
    const starter = this.configService.get<string>('STRIPE_PRICE_STARTER');
    const pro = this.configService.get<string>('STRIPE_PRICE_PRO');
    const ids = new Set<string>();

    if (starter) {
      ids.add(starter);
    }
    if (pro) {
      ids.add(pro);
    }

    return ids;
  }


  private ensureWebhookConfiguration(): void {
    if (!this.configService.get<string>('STRIPE_WEBHOOK_SECRET')) {
      throw new ServiceUnavailableException('Missing STRIPE_WEBHOOK_SECRET.');
    }
  }
  async createCheckoutSession(payload: CheckoutPayload): Promise<{ url: string }> {
    const stripe = this.ensureStripeConfigured();
    const allowedPriceIds = this.getAllowedPriceIds();

    if (allowedPriceIds.size === 0) {
      throw new ServiceUnavailableException('No Stripe prices are configured.');
    }

    if (!allowedPriceIds.has(payload.priceId)) {
      throw new BadRequestException('Unsupported priceId.');
    }

    const tenant = await this.prisma.organization.findUnique({
      where: { id: payload.tenantId },
      select: { id: true, name: true, stripeCustomerId: true, isDemo: true },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found.');
    }
    if (tenant.isDemo) {
      throw new BadRequestException('Billing is disabled in demo mode.');
    }

    const ownerMembership = await this.prisma.membership.findFirst({
      where: { orgId: tenant.id, role: 'TENANT_OWNER', status: 'ACTIVE' },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const customerId = tenant.stripeCustomerId
      ? tenant.stripeCustomerId
      : (
          await stripe.customers.create({
            email: ownerMembership?.user.email,
            name: tenant.name,
            metadata: { tenantId: tenant.id },
          })
        ).id;

    if (!tenant.stripeCustomerId) {
      await this.prisma.organization.update({
        where: { id: tenant.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: payload.priceId, quantity: 1 }],
      success_url: payload.successUrl,
      cancel_url: payload.cancelUrl,
      metadata: {
        tenantId: tenant.id,
      },
      subscription_data: {
        metadata: {
          tenantId: tenant.id,
        },
      },
    });

    if (!session.url) {
      throw new ServiceUnavailableException('Stripe checkout session URL is unavailable.');
    }

    return { url: session.url };
  }

  async createPortalSession(tenantId: string, returnUrl: string): Promise<{ url: string }> {
    const stripe = this.ensureStripeConfigured();
    const tenant = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      select: { stripeCustomerId: true, isDemo: true },
    });

    if (tenant?.isDemo) {
      throw new BadRequestException('Billing portal is disabled in demo mode.');
    }
    if (!tenant?.stripeCustomerId) {
      throw new BadRequestException('Stripe customer is not set for this tenant.');
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: portalSession.url };
  }

  async getTenantBillingStatus(tenantId: string): Promise<TenantBillingStatus> {
    const tenant = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      select: {
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

    const whiteLabelEligible = this.subscriptionGatingService.isWhiteLabelEligible({
      stripePriceId: tenant.stripePriceId,
      subscriptionStatus: tenant.subscriptionStatus,
    });

    return {
      subscriptionStatus: tenant.subscriptionStatus,
      currentPeriodEnd: tenant.currentPeriodEnd ? tenant.currentPeriodEnd.toISOString() : null,
      priceId: tenant.stripePriceId,
      whiteLabelEligible,
      whiteLabelEnabled: tenant.whiteLabelEnabled,
    };
  }

  async handleWebhook(payload: Buffer, signature?: string | string[]) {
    this.ensureWebhookConfiguration();
    const stripe = this.ensureStripeConfigured();
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new ServiceUnavailableException('Missing STRIPE_WEBHOOK_SECRET.');
    }

    if (!signature) {
      throw new BadRequestException('Missing Stripe signature header.');
    }

    const sig = Array.isArray(signature) ? signature[0] : signature;
    const event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.handleSubscriptionEvent(event.data.object as Stripe.Subscription);
        break;
      default:
        this.logger.log(`Unhandled Stripe event: ${event.type}`);
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const tenantId = session.metadata?.tenantId;
    const customerId = typeof session.customer === 'string' ? session.customer : null;

    if (!tenantId || !customerId) {
      this.logger.warn('checkout.session.completed missing tenant/customer metadata.');
      return;
    }

    await this.prisma.organization.update({
      where: { id: tenantId },
      data: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
      },
    });
  }

  private async handleSubscriptionEvent(subscription: Stripe.Subscription): Promise<void> {
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : null;

    if (!customerId) {
      this.logger.warn('Subscription webhook missing customer id.');
      return;
    }

    const tenant = await this.prisma.organization.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true, whiteLabelEnabled: true },
    });

    if (!tenant) {
      this.logger.warn(`No tenant found for Stripe customer ${customerId}.`);
      return;
    }

    const nextPriceId = subscription.items.data[0]?.price?.id ?? null;
    const nextStatus = subscription.status;
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null;

    const eligible = this.subscriptionGatingService.isWhiteLabelEligible({
      stripePriceId: nextPriceId,
      subscriptionStatus: nextStatus,
    });

    await this.prisma.organization.update({
      where: { id: tenant.id },
      data: {
        stripeSubscriptionId: subscription.id,
        stripePriceId: nextPriceId,
        subscriptionStatus: nextStatus,
        currentPeriodEnd,
        whiteLabelEnabled: eligible ? tenant.whiteLabelEnabled : false,
        upgradedAt: nextStatus === 'active' ? new Date() : undefined,
      },
    });

    if (nextStatus === 'active') {
      await this.prisma.trialEvent.create({ data: { tenantId: tenant.id, eventType: 'upgraded' } });
    } else if (nextStatus === 'trialing') {
      await this.prisma.trialEvent.create({ data: { tenantId: tenant.id, eventType: 'trial_active' } });
    } else if (nextStatus === 'canceled') {
      await this.prisma.trialEvent.create({ data: { tenantId: tenant.id, eventType: 'trial_expired' } });
    }


    this.logger.log(`Processed subscription update for tenant ${tenant.id} with status ${nextStatus}.`);
  }
}
