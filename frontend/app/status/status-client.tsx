"use client";

import { useEffect, useState } from "react";
import { MarketingFooter, MarketingNavbar } from "../components/marketing-chrome";
import { buildApiUrl } from "../../src/lib/apiFetch";

type HealthPayload = {
  ok: boolean;
  uptimeSeconds: number;
  version: string;
  database: { connected: boolean };
  timestamp: string;
};

export function StatusClient() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const response = await fetch(buildApiUrl('/health'), { cache: 'no-store' });
        if (!response.ok) {
          setError('Status endpoint unavailable.');
          return;
        }
        const payload = (await response.json()) as HealthPayload;
        setHealth(payload);
      } catch {
        setError('Unable to fetch status right now.');
      }
    }

    void load();
  }, []);

  return (
    <div className="min-h-screen">
      <MarketingNavbar />
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-16 text-slate-200">
        <h1 className="text-4xl font-semibold text-white">System status</h1>
        {error ? <p className="text-rose-300">{error}</p> : null}
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8">
          <p>API: {health?.ok ? 'Operational' : 'Unknown'}</p>
          <p>Database: {health?.database.connected ? 'Connected' : 'Unavailable'}</p>
          <p>Version: {health?.version ?? '-'}</p>
          <p>Uptime: {health ? `${Math.round(health.uptimeSeconds)}s` : '-'}</p>
          <p>Updated: {health ? new Date(health.timestamp).toLocaleString() : '-'}</p>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
