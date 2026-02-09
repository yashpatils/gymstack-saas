"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

type MeResponse = {
  email: string;
  role: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<MeResponse | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const data = await apiFetch<MeResponse>("/auth/me");
        setUser(data);
      } catch (error) {
        router.replace("/login");
      }
    };

    void fetchProfile();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto w-full max-w-2xl space-y-4 rounded-3xl border border-white/10 bg-slate-900/60 p-8">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
          GymStack
        </p>
        <h1 className="text-3xl font-semibold">
          {user ? "Welcome back." : "Loading your dashboard..."}
        </h1>
        {user && (
          <div className="space-y-1 text-sm text-slate-200">
            <p>
              <span className="font-semibold text-white">Email:</span>{" "}
              {user.email}
            </p>
            <p>
              <span className="font-semibold text-white">Role:</span>{" "}
              {user.role}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
