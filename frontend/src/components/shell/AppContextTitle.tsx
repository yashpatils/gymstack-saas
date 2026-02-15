"use client";

import { useAuth } from "../../providers/AuthProvider";

export function AppContextTitle() {
  const { platformRole, activeContext, activeLocation } = useAuth();

  const title =
    platformRole === "PLATFORM_ADMIN" || activeContext?.role === "TENANT_OWNER"
      ? "Gym Stack"
      : activeLocation?.name ?? "Gym Stack";

  return (
    <p className="max-w-[50vw] truncate text-center text-base font-semibold tracking-wide text-foreground/90 sm:max-w-[40vw] md:max-w-[32rem] md:text-lg">
      {title}
    </p>
  );
}
