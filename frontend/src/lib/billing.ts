import { apiFetch } from "./apiFetch";
import type { BillingStatusResponse, Plan } from "../types/billing";

export type { BillingStatusResponse, Plan };

export type CreateCheckoutResponse = {
  checkoutUrl?: string | null;
  sessionId?: string | null;
};

export async function createCheckout(plan: Plan, userId: string): Promise<CreateCheckoutResponse> {
  return apiFetch<CreateCheckoutResponse>("/api/billing/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      priceId: plan.priceId,
    }),
  });
}

export async function getBillingStatus(userId: string): Promise<BillingStatusResponse> {
  return apiFetch<BillingStatusResponse>(`/api/billing/status/${userId}`, {
    method: "GET",
  });
}
