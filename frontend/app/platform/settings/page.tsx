"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../src/providers/AuthProvider";
import { apiFetch } from "../../lib/api";
import { getApiBaseUrl } from "../../../src/lib/api";

type AccountInfo = {
  id?: string;
  email?: string;
  role?: string;
};

function maskApiBaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.host;

    if (host.length <= 4) {
      return `${parsed.protocol}//****`;
    }

    return `${parsed.protocol}//${host.slice(0, 2)}****${host.slice(-2)}`;
  } catch {
    return "Unavailable";
  }
}

export default function PlatformSettingsPage() {
  const { logout } = useAuth();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl = useMemo(() => {
    try {
      return getApiBaseUrl();
    } catch {
      return "Unavailable";
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadAccountInfo() {
      setLoading(true);
      setError(null);

      try {
        const data = await apiFetch<AccountInfo>("/api/auth/me", { method: "GET" });

        if (isMounted) {
          setAccount(data);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Could not load account info.",
          );
          setAccount(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadAccountInfo();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="page space-y-6">
      <header className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Account preferences and environment details.</p>
        </div>
      </header>

      <div className="card space-y-4">
        <h2 className="section-title">Account</h2>
        {loading ? (
          <p className="text-sm text-slate-300">Loading account info...</p>
        ) : error ? (
          <p className="text-sm text-rose-300">{error}</p>
        ) : (
          <dl className="space-y-2 text-sm text-slate-200">
            <div>
              <dt className="text-slate-400">Email</dt>
              <dd>{account?.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Role</dt>
              <dd>{account?.role ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">User ID</dt>
              <dd>{account?.id ?? "Not provided"}</dd>
            </div>
          </dl>
        )}

        <button type="button" className="button secondary" onClick={logout}>
          Logout
        </button>
      </div>

      <div className="card space-y-4">
        <h2 className="section-title">Environment</h2>
        <dl className="space-y-2 text-sm text-slate-200">
          <div>
            <dt className="text-slate-400">API base URL</dt>
            <dd>{maskApiBaseUrl(apiBaseUrl)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Backend health</dt>
            <dd>
              <Link href="/platform/status" className="text-indigo-300 hover:text-indigo-200">
                Open platform status checks
              </Link>
            </dd>
          </div>
        </dl>
      </div>

      <div className="card space-y-4 border border-rose-500/30">
        <h2 className="section-title text-rose-300">Danger zone</h2>
        <p className="text-sm text-slate-300">Delete account (coming soon).</p>
        <button type="button" className="button secondary" disabled>
          Delete account
        </button>
      </div>
    </section>
  );
}
