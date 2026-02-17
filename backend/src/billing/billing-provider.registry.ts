import { Injectable, NotFoundException } from '@nestjs/common';
import { BillingProvider } from '@prisma/client';
import { BillingProviderAdapter } from './billing.types';
import { StripeBillingProvider } from './providers/stripe-billing.provider';
import { RazorpayBillingProvider } from './providers/razorpay-billing.provider';

@Injectable()
export class BillingProviderRegistry {
  private readonly providers = new Map<BillingProvider, BillingProviderAdapter>();

  constructor(
    stripeProvider: StripeBillingProvider,
    razorpayProvider: RazorpayBillingProvider,
  ) {
    this.providers.set(stripeProvider.name, stripeProvider);
    this.providers.set(razorpayProvider.name, razorpayProvider);
  }

  getProvider(providerName: BillingProvider): BillingProviderAdapter {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new NotFoundException(`Unsupported billing provider: ${providerName}`);
    }

    return provider;
  }
}
