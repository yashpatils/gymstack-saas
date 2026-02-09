"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface UserProfile {
  email?: string;
  name?: string;
  role?: string;
  [key: string]: unknown;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = window.localStorage.getItem("token");
      if (!token) {
        router.replace("/login");
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        setError("Missing backend URL");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${apiUrl}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401 || response.status === 403) {
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error("Unable to load profile");
        }

        const data = (await response.json()) as UserProfile;
        setUser(data);
      } catch (fetchError) {
        setError("Unable to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto w-full max-w-2xl space-y-6 rounded-3xl border border-white/10 bg-slate-900/60 p-8">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
            GymStack
          </p>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate-300">
            Your account overview and membership details.
          </p>
        </div>

        {loading && <p className="text-sm text-slate-300">Loading...</p>}

        {!loading && error && (
          <p className="text-sm text-rose-300">{error}</p>
        )}

        {!loading && !error && user && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
              <h2 className="text-sm font-semibold text-slate-200">
                User details
              </h2>
              <dl className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400">Email</dt>
                  <dd className="font-medium text-white">
                    {user.email ?? "Not provided"}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400">Name</dt>
                  <dd className="font-medium text-white">
                    {user.name ?? "Not provided"}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400">Role</dt>
                  <dd className="font-medium text-white">
                    {user.role ?? "Not provided"}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
              <h2 className="text-sm font-semibold text-slate-200">
                Raw profile payload
              </h2>
              <pre className="mt-4 max-h-64 overflow-auto rounded-xl bg-slate-950/80 p-4 text-xs text-slate-200">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
