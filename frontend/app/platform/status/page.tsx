"use client";

import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "../../../src/components/ui/Skeleton";
import { apiFetch } from "../../lib/api";

type CheckResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
  skipped?: boolean;
};

type DebugInfo = {
  checkedAt: string | null;
  tokenPresent: boolean;
  health: CheckResult | null;
  dbPing: CheckResult | null;
  currentUser: CheckResult | null;
};

const TOKEN_STORAGE_KEY = "gymstack_token";

async function runCheck(path: string): Promise<CheckResult> {
  try {
    const data = await apiFetch<unknown>(path, { method: "GET" });
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
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

  if (result.skipped) {
    return <p className="text-sm text-amber-300">Skipped: {result.error}</p>;
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

export default function PlatformStatusPage() {
  const [health, setHealth] = useState<CheckResult | null>(null);
  const [dbPing, setDbPing] = useState<CheckResult | null>(null);
  const [currentUser, setCurrentUser] = useState<CheckResult | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [tokenPresent, setTokenPresent] = useState(false);

  useEffect(() => {
    setTokenPresent(Boolean(window.localStorage.getItem(TOKEN_STORAGE_KEY)));
  }, []);

  const debugInfo = useMemo<DebugInfo>(
    () => ({
      checkedAt,
      tokenPresent,
      health,
      dbPing,
      currentUser,
    }),
    [checkedAt, tokenPresent, health, dbPing, currentUser],
  );

  const runChecks = async () => {
    setLoading(true);
    setCopyMessage(null);

    const hasToken = Boolean(window.localStorage.getItem(TOKEN_STORAGE_KEY));
    setTokenPresent(hasToken);

    const [healthResult, dbResult] = await Promise.all([
      runCheck("/api/health"),
      runCheck("/api/db/ping"),
    ]);

    setHealth(healthResult);
    setDbPing(dbResult);

    if (hasToken) {
      const meResult = await runCheck("/api/auth/me");
      setCurrentUser(meResult);
    } else {
      setCurrentUser({
        ok: false,
        skipped: true,
        error: "No auth token in localStorage.",
      });
    }

    setCheckedAt(new Date().toISOString());
    setLoading(false);
  };

  const handleCopy = async () => {
    setCopyMessage(null);

    try {
      await navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
      setCopyMessage("Debug info copied.");
    } catch (error) {
      setCopyMessage(
        error instanceof Error ? error.message : "Failed to copy debug info.",
      );
    }
  };

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6 text-white">
      <h1 className="text-2xl font-semibold">Platform Status</h1>
      <p className="text-sm text-slate-300">
        Quick checks for backend health, DB connectivity, and auth state.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={runChecks}
          disabled={loading}
          className="rounded-md border border-white/20 px-3 py-2 text-sm disabled:opacity-60"
        >
          {loading ? "Running..." : "Run Checks"}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md border border-white/20 px-3 py-2 text-sm"
        >
          Copy Debug Info
        </button>
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
    </main>
  );
}
