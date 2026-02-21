"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../providers/AuthProvider";

type RequireAuthProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
};

export function RequireAuth({
  children,
  fallback,
  redirectTo = "/login",
}: RequireAuthProps) {
  const router = useRouter();
  const { user, authState, isHydrating, isLoading } = useAuth();

  const isLoadingState = authState === "hydrating" || isHydrating || isLoading;

  useEffect(() => {
    if (!isLoadingState && (!user || authState === "guest")) {
      router.replace(redirectTo);
    }
  }, [authState, isLoadingState, redirectTo, router, user]);

  if (isLoadingState) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  if (!user || authState === "guest") {
    return null;
  }

  return <>{children}</>;
}
