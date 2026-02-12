"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "../../../../src/components/PageHeader";
import {
  type AppSettings,
  defaultAppSettings,
  getSettings,
  saveSettings,
} from "../../../../src/lib/settings";
import { useAuth } from "../../../../src/providers/AuthProvider";
import { normalizeRole, requireRole, type Role } from "../../../../src/lib/rbac";

export default function PlatformAdminSettingsPage() {
  const { user, isLoading } = useAuth();
  const role: Role = normalizeRole(user?.role);
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isAllowed = user ? requireRole(role, ["OWNER", "ADMIN"]) : false;

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      setLoading(true);
      setSaved(false);
      setError(null);

      try {
        const response = await getSettings();
        if (mounted) {
          setSettings(response);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load settings.");
          setSettings(defaultAppSettings);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const updateField = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSaved(false);
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const onSave = async () => {
    if (!isAllowed) {
      setError("Not authorized.");
      return;
    }

    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const response = await saveSettings(settings);
      setSettings(response);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || loading) {
    return (
      <section className="page space-y-6">
        <PageHeader title="Admin settings" subtitle="Manage platform settings." />
        <div className="card">
          <p className="text-sm text-slate-300">Loading settings...</p>
        </div>
      </section>
    );
  }

  if (!user || !isAllowed) {
    return (
      <section className="page space-y-6">
        <PageHeader title="Admin settings" subtitle="Manage platform settings." />
        <div className="card">
          <p className="text-sm text-amber-300">Not authorized.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page space-y-6">
      <PageHeader
        title="Admin settings"
        subtitle="Manage platform app configuration."
        breadcrumbs={[
          { label: "Platform", href: "/platform" },
          { label: "Admin settings" },
        ]}
      />

      <div className="card space-y-4">
        <h2 className="section-title">Application settings</h2>

        <label className="block space-y-1">
          <span className="text-sm text-slate-200">App name</span>
          <input
            type="text"
            className="w-full rounded border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            value={settings.appName}
            onChange={(event) => updateField("appName", event.target.value)}
            disabled={saving}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm text-slate-200">Support email</span>
          <input
            type="email"
            className="w-full rounded border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            value={settings.supportEmail}
            onChange={(event) => updateField("supportEmail", event.target.value)}
            disabled={saving}
          />
        </label>

        <label className="flex items-center justify-between rounded border border-white/10 p-3">
          <span className="text-sm text-slate-200">Billing enabled</span>
          <input
            type="checkbox"
            checked={settings.billingEnabled}
            onChange={() => updateField("billingEnabled", !settings.billingEnabled)}
            disabled={saving}
          />
        </label>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {saved ? <p className="text-sm text-emerald-300">Settings saved.</p> : null}

        <button type="button" onClick={onSave} className="button" disabled={saving}>
          {saving ? "Saving..." : "Save settings"}
        </button>
      </div>
    </section>
  );
}
