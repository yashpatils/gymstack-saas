import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

type SubscriptionPayload = {
  customerId: string;
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
};

type CheckoutPayload = {
  userId: string;
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripe?: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      this.logger.warn(
        'Stripe is not configured. Missing STRIPE_SECRET_KEY; Stripe features will be unavailable.',
      );
      return;
    }

    this.stripe = new Stripe(secretKey);
  }

  private ensureStripeConfigured(): Stripe {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }
    return this.stripe;
  }

  async createCustomer(email: string, name?: string) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    return this.getStripe().customers.create({
      email,
      name,
    });
  }

  async createCheckoutSession(payload: CheckoutPayload) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const stripe = this.ensureStripeConfigured();
    const customerId = user.stripeCustomerId
      ? user.stripeCustomerId
      : (
          await stripe.customers.create({
            email: user.email,
            metadata: {
              userId: user.id,
            },
          })
        ).id;

    if (!user.stripeCustomerId) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          stripeCustomerId: customerId,
        },
      });
    }

    const session = await this.createSubscription({
      customerId,
      priceId: payload.priceId,
      successUrl: payload.successUrl,
      cancelUrl: payload.cancelUrl,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: SubscriptionStatus.INCOMPLETE,
      },
    });

    return session;
  }

  async createSubscription(payload: SubscriptionPayload) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    const stripe = this.ensureStripeConfigured();
    const successUrl =
      payload.successUrl ??
      this.configService.get<string>('STRIPE_SUCCESS_URL') ??
      '';
    const cancelUrl =
      payload.cancelUrl ??
      this.configService.get<string>('STRIPE_CANCEL_URL') ??
      '';

    if (!successUrl || !cancelUrl) {
      throw new Error(
        'Missing STRIPE_SUCCESS_URL or STRIPE_CANCEL_URL configuration.',
      );
    }

    return stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: payload.customerId,
      line_items: [
        {
          price: payload.priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
  }

  async handleWebhook(payload: Buffer, signature?: string | string[]) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Missing STRIPE_WEBHOOK_SECRET configuration.');
    }
    if (!signature) {
      throw new Error('Missing Stripe signature header.');
    }

    const sig = Array.isArray(signature) ? signature[0] : signature;
    const event = this.getStripe().webhooks.constructEvent(
      payload,
      sig,
      webhookSecret,
    );

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.handleSubscriptionEvent(
          event.data.object as Stripe.Subscription,
        );
        break;
      case 'invoice.payment_succeeded':
        this.logger.log(`Invoice paid: ${event.data.object.id}`);
        break;
      case 'invoice.payment_failed':
        this.logger.warn(`Invoice failed: ${event.data.object.id}`);
        break;
      default:
        this.logger.log(`Unhandled event: ${event.type}`);
    }

    return { received: true };
  }

  async getSubscriptionStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionStatus: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const customerId =
      typeof session.customer === 'string' ? session.customer : null;
    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : null;

    if (!customerId) {
      this.logger.warn('Checkout session missing customer id');
      return;
    }

    await this.prisma.user.updateMany({
      where: { stripeCustomerId: customerId },
      data: {
        stripeSubscriptionId: subscriptionId ?? undefined,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
      },
    });
  }

  private async handleSubscriptionEvent(subscription: Stripe.Subscription) {
    const customerId =
      typeof subscription.customer === 'string' ? subscription.customer : null;

    if (!customerId) {
      this.logger.warn('Subscription event missing customer id');
      return;
    }

    await this.prisma.user.updateMany({
      where: { stripeCustomerId: customerId },
      data: {
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: this.mapSubscriptionStatus(subscription.status),
      },
    });
  }

  private mapSubscriptionStatus(
    status: Stripe.Subscription.Status,
  ): SubscriptionStatus {
    switch (status) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'canceled':
      case 'unpaid':
        return SubscriptionStatus.CANCELED;
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      case 'incomplete':
      case 'incomplete_expired':
      default:
        return SubscriptionStatus.INCOMPLETE;
    }
  }

  private getStripe(): Stripe {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    return this.stripe;
  }
}
