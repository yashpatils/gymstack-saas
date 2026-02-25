"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../src/providers/AuthProvider";
import { ADMIN_PORTAL_FRESH_LOGIN_URL } from "../../src/lib/adminPortal";

function AuthNavSkeleton() {
  return <div className="h-10 w-44 animate-pulse rounded-full bg-muted" aria-hidden="true" />;
}

export function AuthNav() {
  const { isLoading, isAuthenticated, user, platformRole, logout } = useAuth();
  const [showLoadingSkeleton, setShowLoadingSkeleton] = useState(true);

  const email = user?.email ?? "";
  const initial = useMemo(() => email.slice(0, 1).toUpperCase(), [email]);

  useEffect(() => {
    if (!isLoading) {
      setShowLoadingSkeleton(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowLoadingSkeleton(false);
    }, 4000);

    return () => {
      clearTimeout(timer);
    };
  }, [isLoading]);

  if (isLoading && showLoadingSkeleton) {
    return <AuthNavSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <div className="order-2 flex items-center gap-3 sm:order-3">
        <Link href="/login" className="button ghost">
          Login
        </Link>
        <Link href="/signup" className="button">
          Get started
        </Link>
      </div>
    );
  }

  return (
    <div className="order-2 flex items-center gap-3 sm:order-3">
      <details className="group relative">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground shadow-sm">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
            {initial}
          </span>
          <span className="hidden max-w-28 truncate sm:block">{email}</span>
        </summary>
        <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-xl">
          <Link href="/platform" className="block rounded-lg px-3 py-2 text-sm text-popover-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Dashboard</Link>
          <Link href="/platform/profile" className="block rounded-lg px-3 py-2 text-sm text-popover-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Profile</Link>
          {platformRole === "PLATFORM_ADMIN" ? <a href={ADMIN_PORTAL_FRESH_LOGIN_URL} className="block rounded-lg px-3 py-2 text-sm text-popover-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Platform Admin</a> : null}
          <button type="button" className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={logout}>Logout</button>
        </div>
      </details>
    </div>
  );
}
