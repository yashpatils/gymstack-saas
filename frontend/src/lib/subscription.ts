import { formatStatus } from "./formatters/billing";

export const ACTIVE_SUBSCRIPTION_STATUS = "active";

export function isActiveSubscription(status?: string | null): boolean {
  return (status ?? "").toLowerCase() === ACTIVE_SUBSCRIPTION_STATUS;
}

export function formatSubscriptionStatus(status?: string | null): string {
  return formatStatus(status);
}
