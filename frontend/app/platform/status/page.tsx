"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";

type StatusPayload = {
  status: string;
};

type EndpointCheck = {
  path: string;
  ok: boolean;
  statusText: string;
  responseTimeMs: number;
  checkedAtIso: string;
  error?: string;
};

const AUTO_REFRESH_INTERVAL_MS = 10_000;

async function runTimedCheck(path: string): Promise<EndpointCheck> {
  const startedAt = performance.now();

  try {
    const payload = await apiFetch<StatusPayload>(path, { method: "GET" });
    const responseTimeMs = Math.round(performance.now() - startedAt);
    const statusText = payload.status?.toLowerCase() === "ok" ? "healthy" : "unhealthy";

    return {
      path,
      ok: statusText === "healthy",
      statusText,
      responseTimeMs,
      checkedAtIso: new Date().toISOString(),
    };
  } catch (error) {
    return {
      path,
      ok: false,
      statusText: "unhealthy",
      responseTimeMs: Math.round(performance.now() - startedAt),
      checkedAtIso: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function StatusPill({ ok, text }: { ok: boolean; text: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        ok ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
      }`}
    >
      {text}
    </span>
  );
}

function EndpointCard({ result }: { result: EndpointCheck | null }) {
  if (!result) {
    return <p className="text-sm text-slate-400">Not checked yet.</p>;
  }

  return (
    <dl className="grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
      <div>
        <dt className="text-slate-400">Status</dt>
        <dd className="mt-1">
          <StatusPill ok={result.ok} text={result.statusText} />
        </dd>
      </div>
      <div>
        <dt className="text-slate-400">Response time</dt>
        <dd>{result.responseTimeMs} ms</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-slate-400">Endpoint</dt>
        <dd>{result.path}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-slate-400">Checked at</dt>
        <dd>{new Date(result.checkedAtIso).toLocaleString()}</dd>
      </div>
      {result.error ? (
        <div className="sm:col-span-2">
          <dt className="text-slate-400">Error</dt>
          <dd className="text-rose-300">{result.error}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export default function PlatformStatusPage() {
  const [backendStatus, setBackendStatus] = useState<EndpointCheck | null>(null);
  const [dbStatus, setDbStatus] = useState<EndpointCheck | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const runChecks = useCallback(async () => {
    setLoading(true);

    const [backendResult, dbResult] = await Promise.all([
      runTimedCheck("/api/health"),
      runTimedCheck("/api/db/ping"),
    ]);

    setBackendStatus(backendResult);
    setDbStatus(dbResult);
    setLastCheckedAt(new Date().toISOString());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const id = window.setInterval(() => {
      void runChecks();
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [autoRefresh, runChecks]);

  const overallHealthy = useMemo(() => {
    if (!backendStatus || !dbStatus) {
      return null;
    }

    return backendStatus.ok && dbStatus.ok;
  }, [backendStatus, dbStatus]);

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6 text-white">
      <h1 className="text-2xl font-semibold">Platform Status</h1>
      <p className="text-sm text-slate-300">
        Operational checks for backend availability and database connectivity.
      </p>

      <section className="flex flex-wrap items-center gap-3 rounded-md border border-white/10 p-4">
        <button
          type="button"
          onClick={runChecks}
          disabled={loading}
          className="rounded-md border border-white/20 px-3 py-2 text-sm disabled:opacity-60"
        >
          {loading ? "Refreshing..." : "Refresh now"}
        </button>

        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(event) => setAutoRefresh(event.target.checked)}
            className="h-4 w-4 rounded border border-white/30 bg-slate-900"
          />
          Auto-refresh every {AUTO_REFRESH_INTERVAL_MS / 1000}s
        </label>

        <div className="text-sm text-slate-300">
          Last checked: {lastCheckedAt ? new Date(lastCheckedAt).toLocaleString() : "Never"}
        </div>
      </section>

      <section className="rounded-md border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Overall</h2>
          {overallHealthy === null ? (
            <span className="text-sm text-slate-400">Unknown</span>
          ) : (
            <StatusPill ok={overallHealthy} text={overallHealthy ? "healthy" : "unhealthy"} />
          )}
        </div>
      </section>

      <section className="space-y-2 rounded-md border border-white/10 p-4">
        <h2 className="font-medium">Backend status</h2>
        <EndpointCard result={backendStatus} />
      </section>

      <section className="space-y-2 rounded-md border border-white/10 p-4">
        <h2 className="font-medium">Database ping</h2>
        <EndpointCard result={dbStatus} />
      </section>
    </main>
  );
}
