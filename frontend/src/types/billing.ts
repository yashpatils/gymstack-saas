export type Plan = {
  id: string;
  name: string;
  priceId?: string | null;
  priceMonthly?: number | null;
  features?: string[];
};

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused"
  | "unknown";

export type BillingStatusResponse = {
  subscriptionStatus?: SubscriptionStatus | null;
  plan?: Plan | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
};
