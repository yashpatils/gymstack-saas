"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type MeResponse = {
  email: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!apiUrl) {
        router.replace("/login");
        return;
      }

      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch(`${apiUrl}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Unauthorized");
        }

        const data = (await response.json()) as MeResponse;
        setEmail(data.email);
      } catch (error) {
        router.replace("/login");
      }
    };

    void fetchProfile();
  }, [apiUrl, router]);

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto w-full max-w-2xl space-y-4 rounded-3xl border border-white/10 bg-slate-900/60 p-8">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
          GymStack
        </p>
        <h1 className="text-3xl font-semibold">
          {email ? `Welcome, ${email}` : "Loading your dashboard..."}
        </h1>
      </div>
    </div>
  );
}
