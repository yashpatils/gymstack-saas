"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, buildApiUrl } from "../../../src/lib/api";
import { useAuth } from "../../../src/providers/AuthProvider";

type CheckResult<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
};

type ConsoleErrorRecord = {
  timestamp: string;
  message: string;
};

type SupportBundle = {
  generatedAt: string;
  currentUrl: string;
  apiBaseUrl: string;
  user: {
    email: string | null;
    role: string | null;
  };
  checks: {
    health: CheckResult;
    dbPing: CheckResult;
  };
  consoleErrors: ConsoleErrorRecord[];
};

type ConsoleErrorFn = typeof console.error;

declare global {
  interface Window {
    __supportConsoleErrorBuffer?: ConsoleErrorRecord[];
    __supportOriginalConsoleError?: ConsoleErrorFn;
  }
}

const MAX_CONSOLE_ERRORS = 20;

function serializeConsoleArg(arg: unknown): string {
  if (typeof arg === "string") {
    return arg;
  }

  if (arg instanceof Error) {
    return `${arg.name}: ${arg.message}`;
  }

  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

async function runCheck(path: string): Promise<CheckResult> {
  try {
    const data = await apiFetch(path, { method: "GET", cache: "no-store" });
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export default function PlatformSupportPage() {
  const { user } = useAuth();
  const [health, setHealth] = useState<CheckResult | null>(null);
  const [dbPing, setDbPing] = useState<CheckResult | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>("Unavailable");
  const [consoleErrors, setConsoleErrors] = useState<ConsoleErrorRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const apiBaseUrl = useMemo(() => {
    try {
      return buildApiUrl("").replace(/\/$/, "");
    } catch {
      return "NEXT_PUBLIC_API_URL not configured";
    }
  }, []);

  const refreshSupportData = useCallback(async () => {
    setLoading(true);
    setCopyMessage(null);

    const [healthResult, dbPingResult] = await Promise.all([
      runCheck("/api/health"),
      runCheck("/api/db/ping"),
    ]);

    setHealth(healthResult);
    setDbPing(dbPingResult);

    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.href);
      setConsoleErrors([...(window.__supportConsoleErrorBuffer ?? [])]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!window.__supportConsoleErrorBuffer) {
      window.__supportConsoleErrorBuffer = [];
    }

    if (!window.__supportOriginalConsoleError) {
      window.__supportOriginalConsoleError = console.error;

      console.error = (...args: Parameters<ConsoleErrorFn>) => {
        const message = args.map(serializeConsoleArg).join(" ").slice(0, 2000);
        const nextEntry: ConsoleErrorRecord = {
          timestamp: new Date().toISOString(),
          message,
        };

        const currentBuffer = window.__supportConsoleErrorBuffer ?? [];
        window.__supportConsoleErrorBuffer = [...currentBuffer, nextEntry].slice(
          -MAX_CONSOLE_ERRORS,
        );

        window.__supportOriginalConsoleError?.(...args);
      };
    }

    setCurrentUrl(window.location.href);
    setConsoleErrors([...(window.__supportConsoleErrorBuffer ?? [])]);
  }, []);

  useEffect(() => {
    void refreshSupportData();
  }, [refreshSupportData]);

  const supportBundle = useMemo<SupportBundle>(
    () => ({
      generatedAt: new Date().toISOString(),
      currentUrl,
      apiBaseUrl,
      user: {
        email: user?.email ?? null,
        role: user?.role ?? null,
      },
      checks: {
        health: health ?? { ok: false, error: "Not checked yet" },
        dbPing: dbPing ?? { ok: false, error: "Not checked yet" },
      },
      consoleErrors,
    }),
    [currentUrl, apiBaseUrl, user?.email, user?.role, health, dbPing, consoleErrors],
  );

  const copySupportBundle = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(supportBundle, null, 2));
      setCopyMessage("Support bundle copied to clipboard.");
    } catch {
      setCopyMessage("Clipboard copy failed. Copy manually from the JSON block.");
    }
  };

  return (
    <main className="mx-auto max-w-4xl space-y-5 p-6 text-white">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Support bundle generator</h1>
        <p className="text-sm text-slate-300">
          Collect runtime diagnostics you can share with support.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="button"
          onClick={() => void refreshSupportData()}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh checks"}
        </button>
        <button
          type="button"
          className="button secondary px-8 py-3 text-base font-semibold"
          onClick={() => void copySupportBundle()}
        >
          Copy support bundle
        </button>
      </div>

      {copyMessage ? <p className="text-sm text-slate-300">{copyMessage}</p> : null}

      <section className="space-y-2 rounded-md border border-white/10 p-4">
        <h2 className="font-medium">Support bundle JSON</h2>
        <pre className="overflow-auto rounded-md bg-slate-950/60 p-3 text-xs text-slate-100">
          {JSON.stringify(supportBundle, null, 2)}
        </pre>
      </section>
    </main>
  );
}
