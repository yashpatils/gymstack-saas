"use client";

import { apiFetch } from "../../src/lib/api";

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

export async function createCustomer(payload: CreateCustomerPayload) {
  const response = await apiFetch("/billing/create-customer", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Unable to create Stripe customer.");
  }

  return response.json();
}

export async function createSubscription(payload: CreateSubscriptionPayload) {
  const response = await apiFetch("/billing/create-subscription", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Unable to create Stripe subscription.");
  }

  return response.json();
}
