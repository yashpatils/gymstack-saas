"use client";

import { useState } from "react";
import { Button, Card, PageHeader, PageShell } from "../../components/ui";
import { apiFetch } from "../../lib/api";

type StatusState = {
  healthy: boolean;
  message: string;
};

export default function PlatformStatusPage() {
  const [backendStatus, setBackendStatus] = useState<StatusState | null>(null);
  const [dbStatus, setDbStatus] = useState<StatusState | null>(null);
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    setLoading(true);

    try {
      const healthResponse = await apiFetch("/health", { method: "GET" });
      const healthData = (await healthResponse.json()) as { status?: string };
      setBackendStatus({
        healthy: true,
        message: healthData.status ?? "Backend is healthy.",
      });
    } catch (error) {
      setBackendStatus({
        healthy: false,
        message:
          error instanceof Error
            ? error.message
            : "Backend health check failed.",
      });
    }

    try {
      const dbResponse = await apiFetch("/api/db/ping", { method: "GET" });
      const dbData = (await dbResponse.json()) as { message?: string };
      setDbStatus({
        healthy: true,
        message: dbData.message ?? "Database is reachable.",
      });
    } catch (error) {
      setDbStatus({
        healthy: false,
        message:
          error instanceof Error ? error.message : "Database ping failed.",
      });
    }

    setLoading(false);
  };

  return (
    <PageShell>
      <PageHeader
        title="Platform status"
        subtitle="Run quick checks for backend and database connectivity."
        actions={
          <Button onClick={checkStatus} disabled={loading}>
            {loading ? "Checking..." : "Run checks"}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Backend health (/health)">
          {backendStatus ? (
            <p className={backendStatus.healthy ? "text-emerald-300" : "text-rose-300"}>
              {backendStatus.healthy ? "Success:" : "Failed:"} {backendStatus.message}
            </p>
          ) : (
            <p className="text-slate-400">Not checked yet.</p>
          )}
        </Card>

        <Card title="Database ping (/api/db/ping)">
          {dbStatus ? (
            <p className={dbStatus.healthy ? "text-emerald-300" : "text-rose-300"}>
              {dbStatus.healthy ? "Success:" : "Failed:"} {dbStatus.message}
            </p>
          ) : (
            <p className="text-slate-400">Not checked yet.</p>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
