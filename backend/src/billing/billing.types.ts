import { BillingProvider, PlanKey, SubscriptionStatus } from '@prisma/client';

export type BillingCheckoutInput = {
  tenantId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
};

export type BillingPortalInput = {
  tenantId: string;
  returnUrl: string;
};

export type BillingWebhookEvent = {
  provider: BillingProvider;
  type: string;
  payload: unknown;
};

export type TenantBillingStatus = {
  planKey: PlanKey;
  planName: string;
  provider: BillingProvider;
  billingCountry: string | null;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd: string | null;
  priceId: string | null;
  whiteLabelEligible: boolean;
  whiteLabelEnabled: boolean;
  usage: {
    locationsUsed: number;
    maxLocations: number;
    staffSeatsUsed: number;
    maxStaffSeats: number;
  };
};

export interface BillingProviderAdapter {
  readonly name: BillingProvider;
  createCheckout(input: BillingCheckoutInput): Promise<{ url: string }>;
  createPortal?(input: BillingPortalInput): Promise<{ url: string }>;
  parseWebhook(payload: Buffer, signature?: string | string[]): Promise<BillingWebhookEvent>;
  syncFromEvent(event: BillingWebhookEvent): Promise<void>;
}
