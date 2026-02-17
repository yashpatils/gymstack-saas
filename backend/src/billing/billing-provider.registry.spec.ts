import { BillingProvider } from '@prisma/client';
import { BillingProviderRegistry } from './billing-provider.registry';
import { BillingProviderAdapter } from './billing.types';

function buildProvider(name: BillingProvider): BillingProviderAdapter {
  return {
    name,
    async createCheckout() {
      return { url: '' };
    },
    async createPortal() {
      return { url: '' };
    },
    async parseWebhook() {
      return { provider: name, type: 'test', payload: {} };
    },
    async syncFromEvent() {
      return;
    },
  };
}

describe('BillingProviderRegistry', () => {
  it('returns matching provider', () => {
    const stripeProvider = buildProvider(BillingProvider.STRIPE);
    const razorpayProvider = buildProvider(BillingProvider.RAZORPAY);
    const registry = new BillingProviderRegistry(
      stripeProvider as unknown as never,
      razorpayProvider as unknown as never,
    );

    expect(registry.getProvider(BillingProvider.STRIPE)).toBe(stripeProvider);
    expect(registry.getProvider(BillingProvider.RAZORPAY)).toBe(razorpayProvider);
  });
});
