"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../../src/components/PageHeader";
import { useAuth } from "../../../src/providers/AuthProvider";
import { getApiBaseUrl } from "../../../src/lib/api";
import { apiFetch } from "../../lib/api";

type AccountInfo = {
  id?: string;
  email?: string;
  role?: string;
};

type DomainRecord = {
  id: string;
  hostname: string;
  status: string;
  locationId?: string | null;
  createdAt: string;
};

type GymLocation = {
  id: string;
  name: string;
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
  const { logout, user } = useAuth();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [locations, setLocations] = useState<GymLocation[]>([]);
  const [hostname, setHostname] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');

  const isAdmin = (user?.role ?? account?.role ?? "") === "ADMIN";
  const showDebugLinks = process.env.NODE_ENV !== "production" || isAdmin;

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


    async function loadDomains() {
      const data = await apiFetch<DomainRecord[]>('/api/domains', { method: 'GET' });
      if (isMounted) setDomains(data);
    }

    async function loadLocations() {
      const gyms = await apiFetch<GymLocation[]>('/api/gyms', { method: 'GET' });
      if (isMounted) setLocations(gyms);
    }

    void loadAccountInfo();
    void loadDomains();
    void loadLocations();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="page space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Account preferences and environment details."
        breadcrumbs={[
          { label: "Platform", href: "/platform" },
          { label: "Settings" },
        ]}
      />

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
          {showDebugLinks ? (
            <>
              <div>
                <dt className="text-slate-400">Backend health</dt>
                <dd>
                  <Link href="/platform/status" className="text-indigo-300 hover:text-indigo-200">
                    Open platform status checks
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Diagnostics</dt>
                <dd>
                  <Link href="/platform/diagnostics" className="text-indigo-300 hover:text-indigo-200">
                    Open deployment diagnostics
                  </Link>
                </dd>
              </div>
            </>
          ) : null}
        </dl>
      </div>


      <div className="card space-y-4">
        <h2 className="section-title">Domains</h2>
        <form className="grid gap-3 md:grid-cols-3" onSubmit={async (event) => {
          event.preventDefault();
          await apiFetch('/api/domains', {
            method: 'POST',
            body: { hostname, locationId: selectedLocationId || null },
          });
          setHostname('');
          setSelectedLocationId('');
          const data = await apiFetch<DomainRecord[]>('/api/domains', { method: 'GET' });
          setDomains(data);
        }}>
          <input className="input" value={hostname} onChange={(event) => setHostname(event.target.value)} placeholder="yourdomain.com" required />
          <select className="input" value={selectedLocationId} onChange={(event) => setSelectedLocationId(event.target.value)}>
            <option value="">Tenant-wide</option>
            {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
          <button className="button" type="submit">Add domain</button>
        </form>
        <ul className="space-y-2 text-sm">
          {domains.map((domain) => (
            <li key={domain.id} className="rounded border border-white/10 p-3">
              <div className="flex items-center justify-between">
                <span>{domain.hostname}</span>
                <span className="text-slate-300">{domain.status}</span>
              </div>
              <p className="text-xs text-slate-400">TXT: _gymstack-verification</p>
              <div className="mt-2 flex gap-2">
                <button className="button secondary" type="button" onClick={async () => {
                  await apiFetch(`/api/domains/${domain.id}/verify`, { method: 'POST' });
                  const data = await apiFetch<DomainRecord[]>('/api/domains', { method: 'GET' });
                  setDomains(data);
                }}>Verify</button>
                <button className="button secondary" type="button" onClick={async () => {
                  await apiFetch(`/api/domains/${domain.id}`, { method: 'DELETE' });
                  setDomains((existing) => existing.filter((item) => item.id !== domain.id));
                }}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
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
