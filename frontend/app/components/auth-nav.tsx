"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { me } from "../../src/lib/auth";
import type { AuthMeResponse } from "../../src/types/auth";

type AuthNavState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "authenticated"; session: AuthMeResponse };

function AuthNavSkeleton() {
  return <div className="h-10 w-44 animate-pulse rounded-full bg-white/10" aria-hidden="true" />;
}

export function AuthNav() {
  const router = useRouter();
  const [state, setState] = useState<AuthNavState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const session = await me();
        if (!active) {
          return;
        }
        setState({ status: "authenticated", session });
      } catch {
        if (!active) {
          return;
        }
        setState({ status: "guest" });
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);


  useEffect(() => {
    if (state.status !== "authenticated") {
      return;
    }

    const effectiveRole = state.session.effectiveRole;
    if (effectiveRole === "GYM_STAFF_COACH" || effectiveRole === "CLIENT") {
      router.replace("/platform");
    }
  }, [router, state]);
  if (state.status === "loading") {
    return <AuthNavSkeleton />;
  }

  if (state.status === "guest") {
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

  const email = state.session.user.email;
  const initial = email.slice(0, 1).toUpperCase();
  const isPlatformAdmin = state.session.platformRole === "PLATFORM_ADMIN";

  return (
    <div className="order-2 flex items-center gap-3 sm:order-3">
      <Link href="/platform" className="button">
        Dashboard
      </Link>
      {isPlatformAdmin ? (
        <Link href="/admin" className="button ghost">
          Platform Admin
        </Link>
      ) : null}
      <Link href="/platform/profile" className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-slate-200">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-400/25 text-xs font-semibold text-indigo-100">
          {initial}
        </span>
        <span className="hidden max-w-28 truncate sm:block">{email}</span>
      </Link>
    </div>
  );
}
