import { apiFetch } from './api';

export type BillingStatusResponse = {
  subscriptionStatus?: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  [key: string]: unknown;
};

export type CreateCheckoutResponse = {
  checkoutUrl?: string | null;
  [key: string]: unknown;
};

export async function createCheckout(): Promise<CreateCheckoutResponse> {
  return apiFetch<CreateCheckoutResponse>('/api/billing/checkout', {
    method: 'POST',
  });
}

export async function getBillingStatus(
  userId: string,
): Promise<BillingStatusResponse> {
  return apiFetch<BillingStatusResponse>(`/api/billing/status/${userId}`, {
    method: 'GET',
  });
}
