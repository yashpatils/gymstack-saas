"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

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
  if (!API_URL) {
    throw new Error("Missing NEXT_PUBLIC_API_URL configuration.");
  }

  const response = await fetch(`${API_URL}/billing/create-customer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Unable to create Stripe customer.");
  }

  return response.json();
}

export async function createSubscription(payload: CreateSubscriptionPayload) {
  if (!API_URL) {
    throw new Error("Missing NEXT_PUBLIC_API_URL configuration.");
  }

  const response = await fetch(`${API_URL}/billing/create-subscription`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Unable to create Stripe subscription.");
  }

  return response.json();
}
