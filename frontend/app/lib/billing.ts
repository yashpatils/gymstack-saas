"use client";

import { apiFetch } from "./apiFetch";

type CreateCustomerPayload = {
  email: string;
  name?: string;
};

type CreateSubscriptionPayload = {
  customerId: string;
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
};

type CreateCheckoutPayload = {
  userId: string;
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
};

export type SubscriptionStatusResponse = {
  subscriptionStatus: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

export async function createCustomer(payload: CreateCustomerPayload) {
  return apiFetch<{ customerId: string }>("/billing/create-customer", {
    method: "POST",
    body: payload,
  });
}

export async function createCheckoutSession(payload: CreateCheckoutPayload) {
  return apiFetch<{
    checkoutUrl: string | null;
    sessionId: string;
    customerId: string | null;
  }>("/billing/checkout", {
    method: "POST",
    body: payload,
  });
}

export async function getSubscriptionStatus(userId: string) {
  return apiFetch<SubscriptionStatusResponse>(`/billing/status/${userId}`);
}

export async function createSubscription(payload: CreateSubscriptionPayload) {
  return apiFetch<{ checkoutUrl: string | null; sessionId: string }>(
    "/billing/create-subscription",
    {
      method: "POST",
      body: payload,
    },
  );
}
