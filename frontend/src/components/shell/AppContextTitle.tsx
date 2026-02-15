"use client";

import { useAuth } from "../../providers/AuthProvider";

export function AppContextTitle() {
  const { platformRole, activeContext, activeLocation } = useAuth();

  const title =
    platformRole === "PLATFORM_ADMIN" || activeContext?.role === "TENANT_OWNER"
      ? "Gym Stack"
      : activeLocation?.name ?? "Gym Stack";

  return (
    <p className="mx-auto max-w-[20rem] truncate text-center text-sm font-medium tracking-[0.02em] text-slate-300 md:max-w-[28rem] md:text-base">
      {title}
    </p>
  );
}
