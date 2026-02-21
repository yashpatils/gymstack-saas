"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../../providers/AuthProvider";

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
  const { user, authStatus } = useAuth();

  useEffect(() => {
    if (authStatus === "unauthenticated" || (authStatus !== "loading" && !user)) {
      router.replace(redirectTo);
    }
  }, [authStatus, redirectTo, router, user]);

  if (authStatus === "loading") {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  if (!user || authStatus === "unauthenticated") {
    return null;
  }

  return <>{children}</>;
}
