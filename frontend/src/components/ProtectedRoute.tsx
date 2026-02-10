"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../providers/AuthProvider";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-16 text-white">
        <p className="mx-auto w-full max-w-2xl text-sm text-slate-300">
          Loading session...
        </p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
