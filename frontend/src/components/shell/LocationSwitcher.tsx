"use client";

import Link from "next/link";
import { useState } from "react";
import type { LocationOption } from "../../types/auth";

export function LocationSwitcher({
  locations,
  activeLocationId,
  activeMode,
  onSelect,
  canCreate = false,
}: {
  locations: LocationOption[];
  activeLocationId?: string | null;
  activeMode: "OWNER" | "MANAGER";
  onSelect: (locationId: string | null) => Promise<void>;
  canCreate?: boolean;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = async (value: string) => {
    setIsSubmitting(true);
    try {
      await onSelect(value === "ALL" ? null : value);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="sr-only">Active location</span>
      <select
        className="input h-9 w-full min-w-0 sm:min-w-[180px] rounded-xl border-border bg-card text-sm text-card-foreground"
        value={activeMode === "OWNER" ? "ALL" : (activeLocationId ?? "")}
        onChange={(event) => {
          void handleChange(event.target.value);
        }}
        aria-label="Select active location"
        disabled={isSubmitting}
      >
        <option value="ALL">All locations</option>
        {locations.map((location) => (
          <option key={location.id} value={location.id}>{location.displayName}</option>
        ))}
      </select>
      {canCreate ? <Link href="/platform/gyms/new" className="text-xs text-primary hover:text-primary/80">Create new location</Link> : null}
    </label>
  );
}
