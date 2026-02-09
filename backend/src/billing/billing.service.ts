import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

type SubscriptionPayload = {
  customerId: string;
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe?: Stripe;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      this.logger.warn('Missing STRIPE_SECRET_KEY configuration.');
      return;
    }

    this.stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' });
  }

  private getStripeClient(): Stripe {
    if (!this.stripe) {
      throw new Error('Stripe is not configured.');
    }
    return this.stripe;
  }

  async createCustomer(email: string, name?: string) {
    return this.getStripeClient().customers.create({
      email,
      name,
    });
  }

  async createSubscription(payload: SubscriptionPayload) {
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

    return this.getStripeClient().checkout.sessions.create({
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

  handleWebhook(payload: Buffer, signature?: string | string[]) {
    const webhookSecret =
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('Missing STRIPE_WEBHOOK_SECRET configuration.');
    }
    if (!signature) {
      throw new Error('Missing Stripe signature header.');
    }

    const sig = Array.isArray(signature) ? signature[0] : signature;
    const event = this.getStripeClient().webhooks.constructEvent(
      payload,
      sig,
      webhookSecret,
    );

    switch (event.type) {
      case 'checkout.session.completed':
        this.logger.log(`Checkout completed: ${event.data.object.id}`);
        break;
      case 'customer.subscription.created':
        this.logger.log(`Subscription created: ${event.data.object.id}`);
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
}
