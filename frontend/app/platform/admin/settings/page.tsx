"use client";

import { useEffect, useState } from "react";
import PageHeader from "../../../../../src/components/PageHeader";
import {
  defaultFeatureFlags,
  FeatureFlags,
  getFeatureFlags,
  updateFeatureFlags,
} from "../../../../../src/lib/settings";
import { useAuth } from "../../../../../src/providers/AuthProvider";
import { normalizeRole } from "../../../../../src/lib/rbac";

export default function PlatformAdminSettingsPage() {
  const { user } = useAuth();
  const [flags, setFlags] = useState<FeatureFlags>(defaultFeatureFlags);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const role = normalizeRole(user?.role);
  const isOwner = role === "OWNER";

  useEffect(() => {
    let mounted = true;

    const loadFlags = async () => {
      setLoading(true);
      setSaved(false);
      setError(null);

      try {
        const response = await getFeatureFlags();
        if (mounted) {
          setFlags(response);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load settings.");
          setFlags(defaultFeatureFlags);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadFlags();

    return () => {
      mounted = false;
    };
  }, []);

  const onToggle = (key: keyof FeatureFlags) => {
    setSaved(false);
    setFlags((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const onSave = async () => {
    if (!isOwner) {
      setError("Only owners can update admin settings.");
      return;
    }

    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const response = await updateFeatureFlags(flags);
      setFlags(response);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page space-y-6">
      <PageHeader
        title="Admin settings"
        subtitle="Manage server-controlled platform feature flags."
        breadcrumbs={[
          { label: "Platform", href: "/platform" },
          { label: "Admin settings" },
        ]}
      />

      <div className="card space-y-4">
        <h2 className="section-title">Feature flags</h2>

        {loading ? (
          <p className="text-sm text-slate-300">Loading settings...</p>
        ) : (
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded border border-white/10 p-3">
              <span className="text-sm text-slate-200">Enable billing</span>
              <input
                type="checkbox"
                checked={flags.enableBilling}
                onChange={() => onToggle("enableBilling")}
                disabled={!isOwner || saving}
              />
            </label>

            <label className="flex items-center justify-between rounded border border-white/10 p-3">
              <span className="text-sm text-slate-200">Enable team invites</span>
              <input
                type="checkbox"
                checked={flags.enableInvites}
                onChange={() => onToggle("enableInvites")}
                disabled={!isOwner || saving}
              />
            </label>

            <label className="flex items-center justify-between rounded border border-white/10 p-3">
              <span className="text-sm text-slate-200">Enable audit</span>
              <input
                type="checkbox"
                checked={flags.enableAudit}
                onChange={() => onToggle("enableAudit")}
                disabled={!isOwner || saving}
              />
            </label>
          </div>
        )}

        {!isOwner ? (
          <p className="text-sm text-amber-300">Only owners can modify these settings.</p>
        ) : null}

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {saved ? <p className="text-sm text-emerald-300">Settings saved.</p> : null}

        <button
          type="button"
          onClick={onSave}
          className="button"
          disabled={loading || saving || !isOwner}
        >
          {saving ? "Saving..." : "Save settings"}
        </button>
      </div>
    </section>
  );
}
