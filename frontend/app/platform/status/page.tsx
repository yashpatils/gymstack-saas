"use client";

import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "../../../src/components/ui/Skeleton";
import { apiFetch } from "../../lib/api";
import { Button, PageShell } from "../../components/ui";
import PageHeader from "../../../src/components/PageHeader";

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

function ResultBlock({
  result,
  loading,
}: {
  result: CheckResult | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    );
  }
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
    <PageShell className="max-w-4xl space-y-4 text-white">
      <PageHeader
        title="Platform Status"
        subtitle="Quick checks for backend health, DB connectivity, and auth state."
        breadcrumbs={[
          { label: "Platform", href: "/platform" },
          { label: "Status" },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={runChecks} disabled={loading} variant="secondary">
          {loading ? "Running..." : "Run Checks"}
        </Button>
        <Button type="button" onClick={handleCopy} variant="ghost">
          Copy Debug Info
        </Button>
      </div>

      {copyMessage ? <p className="text-sm text-slate-300">{copyMessage}</p> : null}

      <section className="space-y-2 rounded-md border border-white/10 p-4">
        <h2 className="font-medium">Backend health (GET /api/health)</h2>
        <ResultBlock result={health} loading={loading} />
      </section>

      <section className="space-y-2 rounded-md border border-white/10 p-4">
        <h2 className="font-medium">DB ping (GET /api/db/ping)</h2>
        <ResultBlock result={dbPing} loading={loading} />
      </section>

      <section className="space-y-2 rounded-md border border-white/10 p-4">
        <h2 className="font-medium">Current user (GET /api/auth/me)</h2>
        <ResultBlock result={currentUser} loading={loading} />
      </section>

      <section className="space-y-2 rounded-md border border-white/10 p-4">
        <h2 className="font-medium">Debug JSON</h2>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <pre className="overflow-auto rounded-md bg-slate-950/60 p-3 text-xs text-slate-100">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        )}
      </section>
    </PageShell>
  );
}
