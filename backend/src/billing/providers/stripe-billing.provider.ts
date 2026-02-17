import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { BillingProvider, SubscriptionStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingCheckoutInput, BillingPortalInput, BillingProviderAdapter, BillingWebhookEvent } from '../billing.types';
import { normalizeSubscriptionStatus } from '../subscription-status.util';
import { BillingLifecycleService } from '../billing-lifecycle.service';

@Injectable()
export class StripeBillingProvider implements BillingProviderAdapter {
  readonly name = BillingProvider.STRIPE;
  private readonly logger = new Logger(StripeBillingProvider.name);
  private stripe?: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly billingLifecycleService: BillingLifecycleService,
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

    if (starter) ids.add(starter);
    if (pro) ids.add(pro);

    return ids;
  }

  async createCheckout(input: BillingCheckoutInput): Promise<{ url: string }> {
    const stripe = this.ensureStripeConfigured();
    const allowedPriceIds = this.getAllowedPriceIds();

    if (allowedPriceIds.size === 0) {
      throw new ServiceUnavailableException('No Stripe prices are configured.');
    }

    if (!allowedPriceIds.has(input.priceId)) {
      throw new BadRequestException('Unsupported priceId.');
    }

    const tenant = await this.prisma.organization.findUnique({
      where: { id: input.tenantId },
      select: { id: true, name: true, stripeCustomerId: true, isDemo: true },
    });

    if (!tenant) throw new BadRequestException('Tenant not found.');
    if (tenant.isDemo) throw new BadRequestException('Billing is disabled in demo mode.');

    const ownerMembership = await this.prisma.membership.findFirst({
      where: { orgId: tenant.id, role: 'TENANT_OWNER', status: 'ACTIVE' },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const customerId = tenant.stripeCustomerId
      ? tenant.stripeCustomerId
      : (await stripe.customers.create({
          email: ownerMembership?.user.email,
          name: tenant.name,
          metadata: { tenantId: tenant.id },
        })).id;

    if (!tenant.stripeCustomerId) {
      await this.prisma.organization.update({
        where: { id: tenant.id },
        data: { stripeCustomerId: customerId, billingCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: input.priceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: { tenantId: tenant.id },
      subscription_data: { metadata: { tenantId: tenant.id } },
    });

    if (!session.url) {
      throw new ServiceUnavailableException('Stripe checkout session URL is unavailable.');
    }

    return { url: session.url };
  }

  async createPortal(input: BillingPortalInput): Promise<{ url: string }> {
    const stripe = this.ensureStripeConfigured();
    const tenant = await this.prisma.organization.findUnique({
      where: { id: input.tenantId },
      select: { stripeCustomerId: true, billingCustomerId: true, isDemo: true },
    });

    if (tenant?.isDemo) throw new BadRequestException('Billing portal is disabled in demo mode.');
    const customerId = tenant?.billingCustomerId ?? tenant?.stripeCustomerId;
    if (!customerId) {
      throw new BadRequestException('Stripe customer is not set for this tenant.');
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: input.returnUrl,
    });

    return { url: portalSession.url };
  }

  async parseWebhook(payload: Buffer, signature?: string | string[]): Promise<BillingWebhookEvent> {
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

    return {
      provider: BillingProvider.STRIPE,
      type: event.type,
      payload: event.data.object,
    };
  }

  async syncFromEvent(event: BillingWebhookEvent): Promise<void> {
    if (event.type === 'checkout.session.completed') {
      await this.handleCheckoutCompleted(event.payload as Stripe.Checkout.Session);
      return;
    }

    if (
      event.type === 'customer.subscription.created'
      || event.type === 'customer.subscription.updated'
      || event.type === 'customer.subscription.deleted'
    ) {
      await this.handleSubscriptionEvent(event.payload as Stripe.Subscription, event.type);
      return;
    }

    if (event.type === 'invoice.payment_failed') {
      await this.handleInvoiceEvent(event.payload as Stripe.Invoice, 'failed');
      return;
    }

    if (event.type === 'invoice.paid') {
      await this.handleInvoiceEvent(event.payload as Stripe.Invoice, 'paid');
      return;
    }

    this.logger.log(`Unhandled Stripe event: ${event.type}`);
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
        billingProvider: BillingProvider.STRIPE,
        stripeCustomerId: customerId,
        billingCustomerId: customerId,
        stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
        billingSubscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
      },
    });
  }

  private async handleSubscriptionEvent(subscription: Stripe.Subscription, eventType: string): Promise<void> {
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : null;
    if (!customerId) {
      this.logger.warn('Subscription webhook missing customer id.');
      return;
    }

    const tenant = await this.prisma.organization.findFirst({
      where: { OR: [{ stripeCustomerId: customerId }, { billingCustomerId: customerId }] },
      select: { id: true, whiteLabelEnabled: true },
    });

    if (!tenant) {
      this.logger.warn(`No tenant found for Stripe customer ${customerId}.`);
      return;
    }

    const nextPriceId = subscription.items.data[0]?.price?.id ?? null;
    const nextStatus = normalizeSubscriptionStatus(subscription.status);
    const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;

    const isEligible = nextPriceId === this.configService.get<string>('STRIPE_PRICE_PRO')
      && (nextStatus === SubscriptionStatus.ACTIVE || nextStatus === SubscriptionStatus.TRIAL);

    await this.prisma.organization.update({
      where: { id: tenant.id },
      data: {
        billingProvider: BillingProvider.STRIPE,
        stripeSubscriptionId: subscription.id,
        stripePriceId: nextPriceId,
        billingSubscriptionId: subscription.id,
        billingPriceId: nextPriceId,
        subscriptionStatus: nextStatus,
        currentPeriodEnd,
        whiteLabelEnabled: isEligible ? tenant.whiteLabelEnabled : false,
        upgradedAt: nextStatus === SubscriptionStatus.ACTIVE ? new Date() : undefined,
      },
    });

    if (eventType === 'customer.subscription.deleted') {
      await this.billingLifecycleService.handleSubscriptionCanceled(tenant.id);
    }

    this.logger.log(`Processed subscription update for tenant ${tenant.id} with status ${nextStatus}.`);
  }

  private async handleInvoiceEvent(invoice: Stripe.Invoice, mode: 'failed' | 'paid'): Promise<void> {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : null;
    if (!customerId) {
      this.logger.warn('Invoice webhook missing customer id.');
      return;
    }

    const tenant = await this.prisma.organization.findFirst({
      where: { OR: [{ stripeCustomerId: customerId }, { billingCustomerId: customerId }] },
      select: { id: true },
    });

    if (!tenant) {
      this.logger.warn(`No tenant found for Stripe customer ${customerId}.`);
      return;
    }

    if (mode === 'failed') {
      await this.billingLifecycleService.handlePaymentFailed(tenant.id);
      return;
    }

    await this.billingLifecycleService.handlePaymentRecovered(tenant.id);
  }
}

