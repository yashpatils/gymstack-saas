"use client";

import { useAuth } from "../../providers/AuthProvider";

export function AppContextTitle() {
  const { platformRole, activeContext, activeLocation } = useAuth();

  const locationName = activeLocation?.name?.trim();
  const title =
    platformRole === "PLATFORM_ADMIN" || activeContext?.role === "TENANT_OWNER"
      ? "Gym Stack"
      : locationName && locationName.length > 0
        ? locationName
        : "Gym Stack";

  return (
    <p className="max-w-[40vw] truncate text-center text-base font-semibold tracking-wide text-foreground/90 md:max-w-[32rem] md:text-lg">
      {title}
    </p>
  );
}
