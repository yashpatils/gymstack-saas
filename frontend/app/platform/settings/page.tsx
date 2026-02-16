"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../../src/components/PageHeader";
import { useAuth } from "../../../src/providers/AuthProvider";
import { getApiBaseUrl } from "../../../src/lib/apiFetch";
import { apiFetch } from "@/src/lib/apiFetch";
import { oauthStartUrl } from '../../../src/lib/auth';

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
  displayName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  accentGradient?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  customDomain?: string | null;
  domainVerifiedAt?: string | null;
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
  const { logout, user, tenantFeatures, permissions, permissionKeys } = useAuth();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [locations, setLocations] = useState<GymLocation[]>([]);
  const [hostname, setHostname] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [brandingLocationId, setBrandingLocationId] = useState('');

  const isAdmin = (user?.role ?? account?.role ?? "") === "ADMIN";
  const canManageTenantSettings = permissions.canManageTenant
    || permissionKeys.includes('tenant:manage')
    || user?.role === 'OWNER'
    || user?.role === 'ADMIN';
  const showDebugLinks = process.env.NODE_ENV !== "production" || isAdmin;

  if (!canManageTenantSettings) {
    return (
      <section className="page">
        <div className="card space-y-2 border border-amber-300/30 bg-amber-500/10 text-amber-50">
          <h1 className="section-title">Tenant settings are restricted</h1>
          <p className="text-sm text-amber-100/90">
            You don&apos;t have permission to manage tenant-level settings. Contact your owner/admin if this seems incorrect.
          </p>
        </div>
      </section>
    );
  }

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
          setError(fetchError instanceof Error ? fetchError.message : "Could not load account info.");
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
      if (isMounted) {
        setLocations(gyms);
        setBrandingLocationId(gyms[0]?.id ?? '');
      }
    }

    void loadAccountInfo();
    void loadDomains();
    void loadLocations();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedBrandingLocation = locations.find((location) => location.id === brandingLocationId);

  return (
    <section className="page space-y-6">
      <PageHeader title="Settings" subtitle="Account preferences and environment details." breadcrumbs={[{ label: "Platform", href: "/platform" }, { label: "Settings" }]} />

      {!tenantFeatures?.whiteLabelBranding ? (
        <div className="card space-y-2 border border-indigo-400/40">
          <h2 className="section-title">Remove Gym Stack branding</h2>
          <p className="text-sm text-slate-300">Upgrade to remove branding from your location microsites and custom domains.</p>
          <Link href="/platform/billing" className="button w-fit">Upgrade to remove branding</Link>
        </div>
      ) : null}

      <div className="card space-y-4">
        <h2 className="section-title">Location branding</h2>
        <select className="input max-w-md" value={brandingLocationId} onChange={(event) => setBrandingLocationId(event.target.value)}>
          {locations.map((location) => <option key={location.id} value={location.id}>{location.displayName ?? location.name}</option>)}
        </select>
        {selectedBrandingLocation ? (
          <form className="grid gap-3 md:grid-cols-2" onSubmit={async (event) => {
            event.preventDefault();
            await apiFetch(`/api/gyms/${selectedBrandingLocation.id}`, {
              method: 'PATCH',
              body: selectedBrandingLocation,
            });
          }}>
            <input className="input" value={selectedBrandingLocation.displayName ?? ''} onChange={(event) => setLocations((items) => items.map((entry) => entry.id === selectedBrandingLocation.id ? { ...entry, displayName: event.target.value } : entry))} placeholder="Display name" />
            <input className="input" value={selectedBrandingLocation.logoUrl ?? ''} onChange={(event) => setLocations((items) => items.map((entry) => entry.id === selectedBrandingLocation.id ? { ...entry, logoUrl: event.target.value } : entry))} placeholder="Logo URL" />
            <input className="input" value={selectedBrandingLocation.primaryColor ?? ''} onChange={(event) => setLocations((items) => items.map((entry) => entry.id === selectedBrandingLocation.id ? { ...entry, primaryColor: event.target.value } : entry))} placeholder="Primary color (#4f46e5)" />
            <input className="input" value={selectedBrandingLocation.accentGradient ?? ''} onChange={(event) => setLocations((items) => items.map((entry) => entry.id === selectedBrandingLocation.id ? { ...entry, accentGradient: event.target.value } : entry))} placeholder="Gradient CSS" />
            <input className="input" value={selectedBrandingLocation.heroTitle ?? ''} onChange={(event) => setLocations((items) => items.map((entry) => entry.id === selectedBrandingLocation.id ? { ...entry, heroTitle: event.target.value } : entry))} placeholder="Hero title" />
            <input className="input" value={selectedBrandingLocation.heroSubtitle ?? ''} onChange={(event) => setLocations((items) => items.map((entry) => entry.id === selectedBrandingLocation.id ? { ...entry, heroSubtitle: event.target.value } : entry))} placeholder="Hero subtitle" />
            <button className="button w-fit" type="submit">Save branding</button>
          </form>
        ) : <p className="text-sm text-slate-400">Create a location to configure branding.</p>}
      </div>

      <div className="card space-y-4">
        <h2 className="section-title">Domains</h2>
        <form className="grid gap-3 md:grid-cols-3" onSubmit={async (event) => {
          event.preventDefault();
          await apiFetch('/api/domains', { method: 'POST', body: { hostname, locationId: selectedLocationId || null } });
          setHostname('');
          setSelectedLocationId('');
          setDomains(await apiFetch<DomainRecord[]>('/api/domains', { method: 'GET' }));
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
              <div className="flex items-center justify-between"><span>{domain.hostname}</span><span className="text-slate-300">{domain.status}</span></div>
              <p className="text-xs text-slate-400">TXT: _gymstack-verification</p>
              <div className="mt-2 flex gap-2">
                <button className="button secondary" type="button" onClick={async () => {
                  await apiFetch(`/api/domains/${domain.id}/verify`, { method: 'POST' });
                  setDomains(await apiFetch<DomainRecord[]>('/api/domains', { method: 'GET' }));
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

      <div className="card space-y-4"><h2 className="section-title">Account</h2>{loading ? <p className="text-sm text-slate-300">Loading account info...</p> : error ? <p className="text-sm text-rose-300">{error}</p> : <dl className="space-y-2 text-sm text-slate-200"><div><dt className="text-slate-400">Email</dt><dd>{account?.email ?? "—"}</dd></div><div><dt className="text-slate-400">Role</dt><dd>{account?.role ?? "—"}</dd></div><div><dt className="text-slate-400">User ID</dt><dd>{account?.id ?? "Not provided"}</dd></div></dl>}<button type="button" className="button secondary" onClick={logout}>Logout</button></div>

      <div className="card space-y-4"><h2 className="section-title">Linked accounts</h2><p className="text-sm text-slate-300">Link Google or Apple for faster login in manager/staff/client flows.</p><div className="grid gap-3 md:grid-cols-2"><button className="button" type="button" onClick={() => { window.location.href = oauthStartUrl('google', 'link', { returnTo: `${window.location.origin}/platform/settings` }); }}>Link Google</button><button className="button secondary" type="button" onClick={() => { window.location.href = oauthStartUrl('apple', 'link', { returnTo: `${window.location.origin}/platform/settings` }); }}>Link Apple</button></div></div>

      <div className="card space-y-4"><h2 className="section-title">Environment</h2><dl className="space-y-2 text-sm text-slate-200"><div><dt className="text-slate-400">API base URL</dt><dd>{maskApiBaseUrl(apiBaseUrl)}</dd></div>{showDebugLinks ? <><div><dt className="text-slate-400">Backend health</dt><dd><Link href="/platform/status" className="text-indigo-300 hover:text-indigo-200">Open platform status checks</Link></dd></div><div><dt className="text-slate-400">Diagnostics</dt><dd><Link href="/platform/diagnostics" className="text-indigo-300 hover:text-indigo-200">Open deployment diagnostics</Link></dd></div></> : null}</dl></div>
    </section>
  );
}
