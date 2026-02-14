"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, buildApiUrl } from "@/src/lib/apiFetch";

type CheckResult<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
};

type DiagnosticsSnapshot = {
  checkedAt: string | null;
  apiBaseUrl: string;
  health: CheckResult | null;
  routes: CheckResult | null;
  dbPing: CheckResult | null;
};

async function runCheck<T>(path: string): Promise<CheckResult<T>> {
  try {
    const data = await apiFetch<T>(path, { method: "GET" });
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function ResultBlock({ result }: { result: CheckResult | null }) {
  if (!result) {
    return <p className="text-sm text-slate-400">Not checked yet.</p>;
  }

  if (!result.ok) {
    return <p className="text-sm text-rose-300">Error: {result.error}</p>;
  }

  return (
    <pre className="overflow-auto rounded-md bg-slate-950/60 p-3 text-xs text-slate-100">
      {JSON.stringify(result.data, null, 2)}
    </pre>
  );
}

export default function PlatformDiagnosticsPage() {
  const [health, setHealth] = useState<CheckResult | null>(null);
  const [routes, setRoutes] = useState<CheckResult | null>(null);
  const [dbPing, setDbPing] = useState<CheckResult | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const apiBaseUrl = useMemo(() => {
    try {
      return buildApiUrl("").replace(/\/$/, "");
    } catch {
      return "NEXT_PUBLIC_API_URL not configured";
    }
  }, []);

  const diagnostics = useMemo<DiagnosticsSnapshot>(
    () => ({
      checkedAt,
      apiBaseUrl,
      health,
      routes,
      dbPing,
    }),
    [checkedAt, apiBaseUrl, health, routes, dbPing],
  );

  const runDiagnostics = useCallback(async () => {
    setLoading(true);
    setCopyMessage(null);

    const [healthResult, routesResult, dbPingResult] = await Promise.all([
      runCheck("/api/health"),
      runCheck("/debug/routes"),
      runCheck("/api/db/ping"),
    ]);

    setHealth(healthResult);
    setRoutes(routesResult);
    setDbPing(dbPingResult);
    setCheckedAt(new Date().toISOString());
    setLoading(false);
  }, []);

  useEffect(() => {
    void runDiagnostics();
  }, [runDiagnostics]);

  const copyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
      setCopyMessage("Copied diagnostics JSON to clipboard.");
    } catch {
      setCopyMessage("Clipboard copy failed. Copy manually from the JSON block.");
    }
  };

  return (
    <main className="mx-auto max-w-4xl space-y-5 p-6 text-white">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Deployment diagnostics</h1>
        <p className="text-sm text-slate-300">
          Run quick checks to confirm API reachability and route exposure.
        </p>
      </header>

      <section className="space-y-2 rounded-md border border-white/10 p-4">
        <h2 className="font-medium">API base URL in use</h2>
        <pre className="overflow-auto rounded-md bg-slate-950/60 p-3 text-xs text-slate-100">
          {apiBaseUrl}
        </pre>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="button"
          onClick={() => void runDiagnostics()}
          disabled={loading}
        >
          {loading ? "Running diagnostics..." : "Run diagnostics"}
        </button>
        <button
          type="button"
          className="button secondary px-8 py-3 text-base font-semibold"
          onClick={() => void copyDiagnostics()}
        >
          Copy diagnostics JSON
        </button>
      </div>

      {copyMessage ? <p className="text-sm text-slate-300">{copyMessage}</p> : null}

      <section className="space-y-2 rounded-md border border-white/10 p-4">
        <h2 className="font-medium">Health (GET /api/health)</h2>
        <ResultBlock result={health} />
      </section>

      <section className="space-y-2 rounded-md border border-white/10 p-4">
        <h2 className="font-medium">Routes (GET /debug/routes)</h2>
        <ResultBlock result={routes} />
      </section>

      <section className="space-y-2 rounded-md border border-white/10 p-4">
        <h2 className="font-medium">DB ping (GET /api/db/ping)</h2>
        <ResultBlock result={dbPing} />
      </section>

      <section className="space-y-2 rounded-md border border-white/10 p-4">
        <h2 className="font-medium">Diagnostics JSON</h2>
        <pre className="overflow-auto rounded-md bg-slate-950/60 p-3 text-xs text-slate-100">
          {JSON.stringify(diagnostics, null, 2)}
        </pre>
      </section>
    </main>
  );
}
