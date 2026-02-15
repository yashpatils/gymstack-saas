"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "../../src/providers/AuthProvider";

function AuthNavSkeleton() {
  return <div className="h-10 w-44 animate-pulse rounded-full bg-white/10" aria-hidden="true" />;
}

export function AuthNav() {
  const { isLoading, isAuthenticated, user, platformRole, logout } = useAuth();

  const email = user?.email ?? "";
  const initial = useMemo(() => email.slice(0, 1).toUpperCase(), [email]);

  if (isLoading) {
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
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-slate-200">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-400/25 text-xs font-semibold text-indigo-100">
            {initial}
          </span>
          <span className="hidden max-w-28 truncate sm:block">{email}</span>
        </summary>
        <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-white/15 bg-slate-900/95 p-2 shadow-xl">
          <Link href="/platform" className="block rounded-lg px-3 py-2 text-sm text-slate-100 hover:bg-white/10">Dashboard</Link>
          <Link href="/platform/profile" className="block rounded-lg px-3 py-2 text-sm text-slate-100 hover:bg-white/10">Profile</Link>
          {platformRole === "PLATFORM_ADMIN" ? <Link href="/admin" className="block rounded-lg px-3 py-2 text-sm text-slate-100 hover:bg-white/10">Platform Admin</Link> : null}
          <button type="button" className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-200 hover:bg-rose-500/20" onClick={logout}>Logout</button>
        </div>
      </details>
    </div>
  );
}
