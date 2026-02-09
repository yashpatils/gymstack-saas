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
  const response = await apiFetch("/billing/create-customer", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Unable to create Stripe customer.");
  }

  return response.json();
}

export async function createCheckoutSession(payload: CreateCheckoutPayload) {
  if (!API_URL) {
    throw new Error("Missing NEXT_PUBLIC_API_URL configuration.");
  }

  const response = await fetch(`${API_URL}/billing/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Unable to create Stripe checkout session.");
  }

  return response.json();
}

export async function getSubscriptionStatus(userId: string) {
  if (!API_URL) {
    throw new Error("Missing NEXT_PUBLIC_API_URL configuration.");
  }

  const response = await fetch(`${API_URL}/billing/status/${userId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Unable to fetch subscription status.");
  }

  return response.json() as Promise<SubscriptionStatusResponse>;
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
