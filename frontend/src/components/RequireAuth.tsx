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
  fallback = null,
  redirectTo = "/login",
}: RequireAuthProps) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(redirectTo);
    }
  }, [loading, redirectTo, router, user]);

  if (loading) {
    return <>{fallback}</>;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
