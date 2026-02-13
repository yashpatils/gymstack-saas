const labels: Record<string, string> = {
  active: "Active",
  trialing: "Trialing",
  past_due: "Past due",
  canceled: "Canceled",
  incomplete: "Incomplete",
  incomplete_expired: "Expired",
  unpaid: "Unpaid",
  paused: "Paused",
  unknown: "Unknown",
};

export function formatStatus(status?: string | null): string {
  if (!status) {
    return labels.unknown;
  }

  const normalized = status.toLowerCase();
  return labels[normalized] ?? normalized.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
